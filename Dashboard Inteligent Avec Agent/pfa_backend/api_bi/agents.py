import json
import os
from pathlib import Path
from typing import Literal, TypedDict

import sqlite3
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langgraph.graph import END, StateGraph


def get_bi_db_path() -> str:
    try:
        from django.conf import settings

        return str(settings.BI_SQLITE_PATH)
    except Exception:
        root = Path(__file__).resolve().parent.parent.parent
        return os.environ.get("BI_SQLITE_PATH", str(root / "entreprise_test.db"))


_ollama_model = os.environ.get("OLLAMA_MODEL", "qwen3-coder:480b-cloud")
llm = ChatOllama(model=_ollama_model, temperature=0)

analyst_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un Business Analyst Senior expert en Business Intelligence.
Ton rôle est de traduire les demandes métier en une liste de KPIs techniques réalisables.

RÈGLES STRICTES :
1. Tu ne peux proposer que des KPIs qui sont calculables avec les tables et colonnes fournies.
2. Ne génère pas de code SQL.
3. Réponds uniquement avec une liste claire et structurée des KPIs pertinents.
4. Pour chaque KPI, précise brièvement quelles colonnes seront nécessaires.""",
        ),
        (
            "user",
            """
Voici le schéma de notre base de données :
{schema}

La demande de l'utilisateur métier est : "{question}"

Analyse la demande et le schéma, puis propose les KPIs.""",
        ),
    ]
)

auto_analyst_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un analyste BI senior chargé d'un aperçu automatique (zéro question utilisateur).

RÈGLES STRICTES :
1. Tu ne vois que le schéma SQL fourni. Ne génère pas de SQL.
2. Propose EXACTEMENT entre 4 et 10 KPIs pertinents pour un tableau de bord exécutif de synthèse.
3. Inclus une variété de visualisations (chiffres globaux, répartitions, classements) et SI une colonne de date est disponible, inclus au moins une analyse d'évolution temporelle (ex: par mois).
4. Si la table dataset_utilisateur est présente, priorise TOUJOURS cette table (données fraîchement chargées par l'utilisateur) pour tous les KPIs.
5. Sinon, utilise les tables disponibles dans le schéma.
6. Chaque KPI doit être calculable avec les colonnes existantes ; indique les colonnes nécessaires en une courte phrase par KPI.""",
        ),
        (
            "user",
            """Schéma de la base de données :
{schema}

Propose entre 4 et 10 KPIs de synthèse.""",
        ),
    ]
)


class GraphState(TypedDict):
    mode: Literal["conversational", "auto"]
    question_utilisateur: str
    schema_db: str
    kpis_proposes: str
    donnees_brutes: dict
    dashboard_json: str
    erreurs: str
    tentatives: int


def get_database_schema(db_path: str | None = None) -> str:
    path = db_path or get_bi_db_path()
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table';")
    schemas = cursor.fetchall()
    conn.close()
    return "\n".join([schema[0] for schema in schemas if schema[0]])


def agent_auto_analyst(state: GraphState):
    print("--- AUTO-ANALYST (zéro-prompt) ---")
    schema = get_database_schema()
    chain = auto_analyst_prompt | llm
    response = chain.invoke({"schema": schema})
    print(f"KPIs auto :\n{response.content}\n")
    return {"schema_db": schema, "kpis_proposes": response.content}


def agent_business_analyst(state: GraphState):
    print("--- AGENT BUSINESS ANALYST ---")
    question = state["question_utilisateur"]
    schema = get_database_schema()
    chain = analyst_prompt | llm
    response = chain.invoke({"schema": schema, "question": question})
    print(f"KPIs générés :\n{response.content}\n")
    return {"schema_db": schema, "kpis_proposes": response.content}


def agent_analyst_router(state: GraphState):
    if state.get("mode") == "auto":
        return agent_auto_analyst(state)
    return agent_business_analyst(state)


engineer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un Data Engineer expert en SQL (SQLite).
Ton rôle est de prendre une liste de KPIs et de générer les requêtes SQL exactes pour les calculer.

RÈGLES STRICTES :
1. Tu dois utiliser le dialecte SQLite.
2. Tu dois renvoyer UNIQUEMENT un objet JSON valide. Aucune explication, aucun texte en dehors du JSON. Ne mets pas de balises ```json.
3. La clé du JSON doit être le nom du KPI, la valeur doit être la requête SQL.
4. Utilise uniquement les tables et colonnes présentes dans le schéma fourni (ex. dataset_utilisateur ou ventes).

Exemple de format attendu :
{{
    "Chiffre d'affaires total": "SELECT SUM(chiffre_affaires) FROM ventes;",
    "Ventes par région": "SELECT region, SUM(chiffre_affaires) FROM ventes GROUP BY region;"
}}""",
        ),
        (
            "user",
            """
Voici le schéma de la base de données :
{schema}

Voici la liste des KPIs demandés :
{kpis}

ERREURS PRÉCÉDENTES À CORRIGER (Si vide, ignore) :
{erreurs}

Génère le dictionnaire JSON des requêtes SQL.""",
        ),
    ]
)


def execute_sql_queries(sql_dict: dict, db_path: str | None = None):
    path = db_path or get_bi_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    resultats = {}
    erreurs = []
    for kpi_name, query in sql_dict.items():
        try:
            cursor.execute(query)
            rows = [dict(row) for row in cursor.fetchall()]
            resultats[kpi_name] = rows
        except Exception as e:
            erreurs.append(f"Erreur sur '{kpi_name}': {str(e)}")
    conn.close()
    return resultats, erreurs


def agent_data_engineer(state: GraphState):
    print("--- AGENT DATA ENGINEER ---")
    kpis = state["kpis_proposes"]
    schema = state["schema_db"]
    erreurs_passees = state.get("erreurs", "")
    tentatives = state.get("tentatives", 0) + 1
    print(f"-> Tentative SQL n°{tentatives}")
    chain = engineer_prompt | llm
    response = chain.invoke(
        {"schema": schema, "kpis": kpis, "erreurs": erreurs_passees}
    )
    clean_json = response.content.replace("```json", "").replace("```", "").strip()
    try:
        sql_dict = json.loads(clean_json)
        donnees_extraites, erreurs = execute_sql_queries(sql_dict)
        if erreurs:
            print("Erreurs SQL :", erreurs)
            return {"erreurs": str(erreurs), "tentatives": tentatives}
        print("SQL exécuté avec succès.")
        return {"donnees_brutes": donnees_extraites, "erreurs": "", "tentatives": tentatives}
    except json.JSONDecodeError as e:
        print("Format JSON invalide.")
        return {
            "erreurs": f"Format JSON invalide. L'erreur est : {str(e)}. Renvoie uniquement du JSON.",
            "tentatives": tentatives,
        }


def decide_to_loop(state: GraphState):
    erreurs = state.get("erreurs", "")
    tentatives = state.get("tentatives", 0)
    if erreurs and tentatives < 3:
        print("Retry engineer.")
        return "retry"
    if erreurs and tentatives >= 3:
        print("Trop d'échecs SQL.")
        return "end"
    print("Vers designer.")
    return "continue"


designer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un expert en Data Visualization et conception d'interfaces.
Ton rôle est de prendre des données métier brutes et de concevoir la structure JSON d'un Dashboard pour une application React.

Tu as accès à 4 types de composants graphiques :
- "MetricCard" : Pour un chiffre unique ou un KPI global (ex: Chiffre d'affaires total).
- "BarChart" : Pour comparer des éléments (ex: Ventes par région, Top 3).
- "PieChart" : Pour montrer une répartition ou des pourcentages.
- "LineChart" : Pour montrer une évolution dans le temps (ex: Ventes par mois).

RÈGLES STRICTES :
1. Renvoie UNIQUEMENT un objet JSON valide, sans aucune balise markdown (pas de ```json).
2. Adapte le format des données selon le composant choisi.
3. Utilise exactement les types "MetricCard", "BarChart", "PieChart" ou "LineChart" (casse respectée).
4. Ajoute OBLIGATOIREMENT un champ "description" pour chaque composant. Ce champ doit contenir une courte phrase explicative du KPI (qui sera affichée au survol par l'utilisateur).
5. Le JSON doit suivre cette structure :
{{
    "dashboard": [
        {{
            "id": "kpi_1",
            "type": "MetricCard",
            "title": "Chiffre d'affaires total",
            "description": "Montant total généré sur l'ensemble des ventes.",
            "value": 30867904.43
        }},
        {{
            "id": "chart_1",
            "type": "BarChart",
            "title": "Top 3 Régions",
            "description": "Comparaison du chiffre d'affaires entre les meilleures régions.",
            "labels": ["Nord", "Centre", "Sud"],
            "data": [7350978, 6643460, 5000000]
        }},
        {{
            "id": "chart_2",
            "type": "LineChart",
            "title": "Évolution mensuelle",
            "description": "Tendance temporelle des indicateurs mois par mois.",
            "labels": ["Jan", "Fev", "Mar"],
            "data": [100, 150, 120]
        }}
    ]
}}""",
        ),
        (
            "user",
            """
Voici les données brutes extraites de la base de données :
{donnees_brutes}

Conçois le dashboard optimal en JSON.""",
        ),
    ]
)


def agent_data_designer(state: GraphState):
    print("--- AGENT DATA DESIGNER ---")
    donnees = state["donnees_brutes"]
    chain = designer_prompt | llm
    response = chain.invoke({"donnees_brutes": str(donnees)})
    clean_json = response.content.replace("```json", "").replace("```", "").strip()
    print("Dashboard JSON généré.")
    return {"dashboard_json": clean_json}


def build_workflow():
    workflow = StateGraph(GraphState)
    workflow.add_node("analyst", agent_analyst_router)
    workflow.add_node("engineer", agent_data_engineer)
    workflow.add_node("designer", agent_data_designer)
    workflow.set_entry_point("analyst")
    workflow.add_edge("analyst", "engineer")
    workflow.add_conditional_edges(
        "engineer",
        decide_to_loop,
        {"retry": "engineer", "continue": "designer", "end": END},
    )
    workflow.add_edge("designer", END)
    return workflow.compile()


explainer_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un Data Scientist expert.
Ton rôle est d'analyser le schéma d'une base de données et de rédiger une synthèse courte expliquant :
1. De quel domaine ou métier proviennent très probablement ces données.
2. Quelles informations clés on peut y trouver.

RÈGLES STRICTES :
1. Rédige un texte clair et professionnel (1 ou 2 paragraphes).
2. Ne génère pas de code, ni de JSON, juste le texte d'explication.
3. Sois précis sur le potentiel d'analyse de ces données.""",
        ),
        (
            "user",
            """Voici le schéma de la base de données :
{schema}

Rédige l'explication demandée.""",
        ),
    ]
)


def explain_dataset(schema: str = None) -> str:
    print("--- AGENT DATA EXPLAINER ---")
    if schema is None:
        schema = get_database_schema()
    chain = explainer_prompt | llm
    
    response = chain.invoke({"schema": schema})
    print(f"EXPLAINATION :--> \n{response.content}\n")
    return response.content.strip()


column_cleaner_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """Tu es un Data Engineer expert en qualité de données.
Analyse les statistiques des colonnes et propose celles à SUPPRIMER car inutiles pour l'analyse BI.

Critères (par ordre de priorité) :
- Colonnes quasi vides (>=80% de valeurs nulles)
- Colonnes constantes ou quasi constantes (is_constant=true ou unique_ratio très faible)
- Identifiants techniques redondants (id, uuid, hash) sans valeur analytique
- Colonnes dupliquées ou fortement corrélées à une autre
- Métadonnées techniques hors sujet (checksum, version fixe, etc.)

RÈGLES STRICTES :
1. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.
2. Ne propose PAS de supprimer une colonne clé métier (date, montant, catégorie, région, client, produit...).
3. Classe chaque proposition : "high" | "medium" | "low".
4. Si aucune colonne à supprimer, renvoie une liste vide.

Format exact :
{{
  "columns_to_drop": [
    {{"name": "nom_colonne", "reason": "explication courte", "confidence": "high"}}
  ],
  "summary": "Phrase de synthèse en français"
}}""",
        ),
        (
            "user",
            """Statistiques du dataset :
{data_health}

Échantillon ({sample_rows_count} premières lignes) :
{sample_rows}

Propose les colonnes à supprimer.""",
        ),
    ]
)


def suggest_columns_to_drop(data_health: dict, sample_rows: str) -> dict:
    print("--- AGENT COLUMN CLEANER ---")
    chain = column_cleaner_prompt | llm
    response = chain.invoke(
        {
            "data_health": json.dumps(data_health, ensure_ascii=False, indent=2),
            "sample_rows": sample_rows,
            "sample_rows_count": min(5, data_health.get("row_count", 5)),
        }
    )
    clean = response.content.replace("```json", "").replace("```", "").strip()
    try:
        result = json.loads(clean)
    except json.JSONDecodeError as e:
        print(f"JSON invalide du column cleaner : {e}")
        return {
            "columns_to_drop": [],
            "summary": "L'agent n'a pas pu produire de suggestions structurées.",
        }

    columns = result.get("columns_to_drop", [])
    valid_names = {c["name"] for c in data_health.get("columns", [])}
    filtered = [
        c for c in columns
        if isinstance(c, dict)
        and c.get("name") in valid_names
        and c.get("confidence") in ("high", "medium", "low")
    ]
    return {
        "columns_to_drop": filtered,
        "summary": result.get("summary", ""),
    }



