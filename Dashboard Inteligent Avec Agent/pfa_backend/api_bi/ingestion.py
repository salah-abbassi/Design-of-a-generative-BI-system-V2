"""Ingestion fichiers CSV/XLSX vers SQLite (table dataset_utilisateur) + métriques Data Health."""
import io
import re
import sqlite3
from pathlib import Path

import pandas as pd

DATASET_TABLE = "dataset_utilisateur"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}


def _column_slug(name: str) -> str:
    s = str(name).strip()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^0-9a-zA-Z_]", "", s)
    if not s:
        s = "column"
    if s[0].isdigit():
        s = "c_" + s
    return s.lower()


def _dedupe_slugs(slugs: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    out = []
    for b in slugs:
        n = seen.get(b, 0)
        seen[b] = n + 1
        out.append(b if n == 0 else f"{b}_{n}")
    return out


def _read_dataframe(uploaded_file, ext: str) -> pd.DataFrame:
    raw = uploaded_file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError(f"Fichier trop volumineux (max {MAX_UPLOAD_BYTES // (1024 * 1024)} Mo).")
    bio = io.BytesIO(raw)
    if ext == ".csv":
        return pd.read_csv(bio)
    return pd.read_excel(bio, engine="openpyxl")


def compute_data_health(df: pd.DataFrame) -> dict:
    n_rows, n_cols = len(df), len(df.columns)
    columns_info = []
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        null_pct = round(100.0 * null_count / n_rows, 2) if n_rows else 0.0
        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        n_unique = int(df[col].nunique(dropna=True))
        col_info = {
            "name": str(col),
            "dtype": str(df[col].dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "is_numeric": bool(is_numeric),
            "unique_count": n_unique,
            "unique_ratio": round(n_unique / n_rows, 4) if n_rows else 0.0,
            "is_constant": n_unique <= 1,
        }
        if is_numeric:
            col_info["mean"] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
            col_info["min"] = float(df[col].min()) if not pd.isna(df[col].min()) else None
            col_info["max"] = float(df[col].max()) if not pd.isna(df[col].max()) else None
            col_info["std"] = float(df[col].std()) if not pd.isna(df[col].std()) else None
            
        columns_info.append(col_info)
    columns_info.sort(key=lambda x: x["null_pct"], reverse=True)

    datetime_ranges = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            s = pd.to_datetime(df[col], errors="coerce").dropna()
            if len(s):
                datetime_ranges.append(
                    {
                        "column": str(col),
                        "min": s.min().isoformat(),
                        "max": s.max().isoformat(),
                    }
                )
        else:
            # try object columns that look like dates
            if df[col].dtype == object:
                try:
                    s = pd.to_datetime(df[col], errors="coerce").dropna()
                    if len(s) >= max(10, n_rows // 10):
                        datetime_ranges.append(
                            {
                                "column": str(col),
                                "min": s.min().isoformat(),
                                "max": s.max().isoformat(),
                            }
                        )
                except Exception:
                    pass

    return {
        "row_count": int(n_rows),
        "column_count": int(n_cols),
        "columns": columns_info,
        "datetime_ranges": datetime_ranges,
    }


def read_and_prepare_dataframe(uploaded_file) -> pd.DataFrame:
    """Lit le fichier uploadé et normalise les noms de colonnes."""
    name = getattr(uploaded_file, "name", "") or ""
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Extension non autorisée. Utilisez .csv ou .xlsx.")

    df = _read_dataframe(uploaded_file, ext)
    if df.empty:
        raise ValueError("Le fichier ne contient aucune ligne de données.")

    old_cols = list(df.columns)
    new_cols = _dedupe_slugs([_column_slug(c) for c in old_cols])
    df.columns = new_cols
    return df


def apply_column_drops(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Supprime les colonnes sélectionnées (ignore les noms invalides)."""
    if not columns:
        return df
    safe = [c for c in columns if c in df.columns]
    if not safe:
        return df
    remaining = len(df.columns) - len(safe)
    if remaining < 1:
        raise ValueError("Impossible de supprimer toutes les colonnes. Gardez au moins une colonne.")
    return df.drop(columns=safe)


def write_dataframe_to_sqlite(df: pd.DataFrame, db_path: str) -> None:
    """Écrit le dataframe dans SQLite (remplace dataset_utilisateur)."""
    conn = sqlite3.connect(db_path)
    try:
        df.to_sql(DATASET_TABLE, conn, if_exists="replace", index=False)
    finally:
        conn.close()


def dataframe_sample_text(df: pd.DataFrame, n: int = 5) -> str:
    return df.head(n).to_string()


def ingest_upload_to_sqlite(uploaded_file, db_path: str) -> tuple[pd.DataFrame, dict]:
    """
    Lit le fichier, normalise les colonnes, remplace DATASET_TABLE dans SQLite.
    Retourne (dataframe utilisé, data_health dict).
    """
    df = read_and_prepare_dataframe(uploaded_file)
    health = compute_data_health(df)
    write_dataframe_to_sqlite(df, db_path)
    return df, health
