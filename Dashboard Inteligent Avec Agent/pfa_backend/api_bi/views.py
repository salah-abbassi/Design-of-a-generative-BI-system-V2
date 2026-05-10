import json
from pathlib import Path

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .agents import build_workflow
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


@api_view(["POST"])
def upload_dataset(request):
    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"erreur": "Aucun fichier fourni (champ « file »)."}, status=400)

    db_path = str(settings.BI_SQLITE_PATH)
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    try:
        _, data_health = ingest_upload_to_sqlite(uploaded, db_path)
    except ValueError as e:
        return Response({"erreur": str(e)}, status=400)
    except Exception as e:
        print(f"Ingestion : {e}")
        return Response({"erreur": "Échec de l'ingestion du fichier."}, status=500)

    inputs = {
        **_initial_graph_state(),
        "mode": "auto",
        "question_utilisateur": "",
    }

    try:
        resultat = app_langgraph.invoke(inputs)
        dj = (resultat.get("dashboard_json") or "").strip()
        payload = {"data_health": data_health}
        if not dj:
            payload["erreur"] = (
                "Ingestion réussie mais l'auto-analyse n'a pas produit de dashboard."
            )
            payload["dashboard"] = []
            return Response(payload, status=200)
        json_final = json.loads(dj)
        payload.update(json_final)
        return Response(payload, status=200)
    except Exception as e:
        print(f"Auto-analyse : {e}")
        return Response(
            {
                "data_health": data_health,
                "erreur": "Ingestion réussie ; échec de l'auto-analyse.",
                "dashboard": [],
            },
            status=500,
        )
