"""Stockage temporaire des uploads en attente de validation des colonnes."""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

SESSION_MAX_AGE_HOURS = 24


def _sessions_dir() -> Path:
    try:
        from django.conf import settings

        path = Path(settings.BI_UPLOAD_SESSIONS_DIR)
    except Exception:
        root = Path(__file__).resolve().parent.parent
        path = root / "upload_sessions"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _session_paths(session_id: str) -> tuple[Path, Path]:
    base = _sessions_dir()
    return base / f"{session_id}.pkl", base / f"{session_id}.json"


def cleanup_old_sessions(max_age_hours: int = SESSION_MAX_AGE_HOURS) -> int:
    removed = 0
    now = datetime.now(timezone.utc)
    for meta_path in _sessions_dir().glob("*.json"):
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            created = datetime.fromisoformat(meta["created_at"])
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age_hours = (now - created).total_seconds() / 3600
            if age_hours > max_age_hours:
                session_id = meta_path.stem
                delete_session(session_id)
                removed += 1
        except Exception:
            continue
    return removed


def create_session(
    df: pd.DataFrame,
    data_health: dict,
    column_cleanup_suggestions: dict,
) -> str:
    cleanup_old_sessions()
    session_id = str(uuid.uuid4())
    pkl_path, json_path = _session_paths(session_id)
    df.to_pickle(pkl_path)
    meta = {
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_health": data_health,
        "column_cleanup_suggestions": column_cleanup_suggestions,
    }
    json_path.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return session_id


def get_session(session_id: str) -> tuple[pd.DataFrame, dict]:
    pkl_path, json_path = _session_paths(session_id)
    if not pkl_path.exists() or not json_path.exists():
        raise ValueError("Session expirée ou introuvable. Veuillez téléverser à nouveau le fichier.")
    df = pd.read_pickle(pkl_path)
    meta = json.loads(json_path.read_text(encoding="utf-8"))
    return df, meta


def delete_session(session_id: str) -> None:
    pkl_path, json_path = _session_paths(session_id)
    for path in (pkl_path, json_path):
        if path.exists():
            path.unlink()
