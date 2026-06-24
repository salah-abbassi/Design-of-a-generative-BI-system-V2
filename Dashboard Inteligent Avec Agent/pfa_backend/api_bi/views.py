import json
from pathlib import Path

from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .agents import build_workflow, explain_dataset, suggest_columns_to_drop
from .ingestion import (
    apply_column_drops,
    compute_data_health,
    dataframe_sample_text,
    read_and_prepare_dataframe,
    write_dataframe_to_sqlite,
)
from .upload_sessions import create_session, delete_session, get_session

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


def _run_post_ingestion_analysis():
    """
    Lance explainer + LangGraph après écriture SQLite.
    Yields des lignes NDJSON ; retourne (explanation, final_state) via StopIteration.
    """
    yield json.dumps({"step": "explanation", "progress": 40}) + "\n"
    explanation = explain_dataset()

    yield json.dumps({"step": "analyst", "progress": 55}) + "\n"
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
            yield json.dumps({"step": "engineer", "progress": 70}) + "\n"
        elif node_name == "engineer":
            yield json.dumps({"step": "designer", "progress": 85}) + "\n"
        elif node_name == "designer":
            yield json.dumps({"step": "finalizing", "progress": 95}) + "\n"

    return explanation, final_state


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
    """
    Phase 1 : ingestion + agent column cleaner.
    Retourne les suggestions et un session_id ; l'utilisateur valide via confirm_upload.
    """
    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"erreur": "Aucun fichier fourni (champ « file »)."}, status=400)

    def generate_progress():
        try:
            yield json.dumps({"step": "ingestion", "progress": 10}) + "\n"
            df = read_and_prepare_dataframe(uploaded)
            data_health = compute_data_health(df)

            yield json.dumps({"step": "column_cleaning", "progress": 25}) + "\n"
            sample = dataframe_sample_text(df)
            suggestions = suggest_columns_to_drop(data_health, sample)
            data_health["column_cleanup_suggestions"] = suggestions

            session_id = create_session(df, data_health, suggestions)

            yield json.dumps({
                "step": "awaiting_confirmation",
                "progress": 30,
                "session_id": session_id,
                "data_health": data_health,
                "column_cleanup_suggestions": suggestions,
            }) + "\n"

        except ValueError as e:
            yield json.dumps({"erreur": str(e)}) + "\n"
        except Exception as e:
            print(f"Erreur d'ingestion : {e}")
            yield json.dumps({"erreur": "Échec du processus. Consultez les logs serveur."}) + "\n"

    return StreamingHttpResponse(generate_progress(), content_type="application/x-ndjson")


@api_view(["POST"])
def confirm_upload(request):
    """
    Phase 2 : applique les suppressions validées, écrit SQLite, lance explainer + LangGraph.
    Body JSON : { "session_id": "...", "columns_to_drop": ["col_a", "col_b"] }
    """
    session_id = request.data.get("session_id")
    columns_to_drop = request.data.get("columns_to_drop", [])

    if not session_id:
        return Response({"erreur": "session_id requis."}, status=400)
    if not isinstance(columns_to_drop, list):
        return Response({"erreur": "columns_to_drop doit être une liste."}, status=400)

    db_path = str(settings.BI_SQLITE_PATH)
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    def generate_progress():
        try:
            df, meta = get_session(session_id)
            valid_names = {c["name"] for c in meta["data_health"].get("columns", [])}
            safe_drops = [c for c in columns_to_drop if c in valid_names]

            yield json.dumps({"step": "applying_drops", "progress": 35}) + "\n"
            df = apply_column_drops(df, safe_drops)
            write_dataframe_to_sqlite(df, db_path)

            data_health = compute_data_health(df)
            data_health["columns_dropped"] = safe_drops
            data_health["column_cleanup_suggestions"] = meta.get("column_cleanup_suggestions", {})

            explanation = None
            final_state = {}
            analysis = _run_post_ingestion_analysis()
            while True:
                try:
                    yield next(analysis)
                except StopIteration as stop:
                    explanation, final_state = stop.value
                    break

            data_health["dataset_explanation"] = explanation
            delete_session(session_id)

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
            print(f"Erreur confirmation upload : {e}")
            yield json.dumps({"erreur": "Échec du processus. Consultez les logs serveur."}) + "\n"

    return StreamingHttpResponse(generate_progress(), content_type="application/x-ndjson")
