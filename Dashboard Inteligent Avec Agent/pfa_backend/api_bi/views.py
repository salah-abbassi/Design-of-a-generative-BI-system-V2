import json
from pathlib import Path

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .agents import build_workflow, explain_dataset
from .ingestion import ingest_upload_to_sqlite

app_langgraph = build_workflow()


def _initial_graph_state():
    return {
        "schema_db": "",
        "kpis_proposes": "",
        "donnees_brutes": {},
        "dashboard_json": "",
        "erreurs": "",
        "tentatives": 0,
    }


@api_view(["POST"])
def generer_dashboard(request):
    question = request.data.get("question")
    if not question:
        return Response({"erreur": "Aucune question fournie."}, status=400)

    inputs = {
        **_initial_graph_state(),
        "mode": "conversational",
        "question_utilisateur": question,
    }

    try:
        resultat = app_langgraph.invoke(inputs)
        dj = (resultat.get("dashboard_json") or "").strip()
        if not dj:
            return Response(
                {
                    "erreur": "Aucun dashboard généré (échecs SQL répétés ou réponse vide).",
                },
                status=500,
            )
        json_final = json.loads(dj)
        return Response(json_final, status=200)
    except Exception as e:
        print(f"Erreur lors de l'exécution : {e}")
        return Response(
            {"erreur": "Une erreur est survenue lors de la génération."}, status=500
        )


from django.http import StreamingHttpResponse

@api_view(["POST"])
def upload_dataset(request):
    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"erreur": "Aucun fichier fourni (champ « file »)."}, status=400)

    db_path = str(settings.BI_SQLITE_PATH)
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    def generate_progress():
        import json
        try:
            yield json.dumps({"step": "ingestion", "progress": 15}) + "\n"
            _, data_health = ingest_upload_to_sqlite(uploaded, db_path)
            
            yield json.dumps({"step": "explanation", "progress": 35}) + "\n"
            explanation = explain_dataset()
            data_health["dataset_explanation"] = explanation

            yield json.dumps({"step": "analyst", "progress": 50}) + "\n"
            inputs = {
                **_initial_graph_state(),
                "mode": "auto",
                "question_utilisateur": "",
            }

            final_state = {}
            for output in app_langgraph.stream(inputs):
                node_name = list(output.keys())[0]
                final_state.update(list(output.values())[0])
                
                if node_name == "analyst":
                    yield json.dumps({"step": "engineer", "progress": 65}) + "\n"
                elif node_name == "engineer":
                    yield json.dumps({"step": "designer", "progress": 85}) + "\n"
                elif node_name == "designer":
                    yield json.dumps({"step": "finalizing", "progress": 95}) + "\n"

            dj = (final_state.get("dashboard_json") or "").strip()
            payload = {"data_health": data_health, "progress": 100, "step": "done"}
            if not dj:
                payload["erreur"] = "Ingestion réussie mais l'auto-analyse n'a pas produit de dashboard."
                payload["dashboard"] = []
            else:
                json_final = json.loads(dj)
                payload.update(json_final)
                
            yield json.dumps(payload) + "\n"
            
        except ValueError as e:
            yield json.dumps({"erreur": str(e)}) + "\n"
        except Exception as e:
            print(f"Erreur d'ingestion/analyse: {e}")
            yield json.dumps({"erreur": "Échec du processus. Consultez les logs serveur."}) + "\n"

    return StreamingHttpResponse(generate_progress(), content_type="application/x-ndjson")
