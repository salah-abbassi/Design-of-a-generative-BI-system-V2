import os
import sqlite3
import random
from datetime import datetime, timedelta
from pathlib import Path


def _db_path() -> str:
    root = Path(__file__).resolve().parent
    return os.environ.get("BI_SQLITE_PATH", str(root / "entreprise_test.db"))


def creer_base_de_donnees():
    # 1. Connexion (cela va créer le fichier s'il n'existe pas)
    path = _db_path()
    print(f"Connexion à la base de données ({path})...")
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # 2. Création du schéma de la table 'ventes'
    print("Création de la table 'ventes'...")
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ventes (
        id_vente INTEGER PRIMARY KEY AUTOINCREMENT,
        date_vente DATE,
        region TEXT,
        categorie_produit TEXT,
        quantite INTEGER,
        chiffre_affaires REAL
    )
    ''')

    # Nettoyer la table si on relance le script plusieurs fois
    cursor.execute('DELETE FROM ventes')

    # 3. Listes de référence pour générer des données réalistes
    regions = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre']
    categories = ['Électronique', 'Vêtements', 'Logiciels', 'Mobilier de bureau']
    
    # Date de début pour nos données (1er Janvier 2023)
    date_debut = datetime(2023, 1, 1)

    # 4. Génération et insertion de 500 lignes aléatoires
    print("Génération de 500 transactions en cours...")
    for _ in range(500):
        # Générer une date aléatoire sur la dernière année
        jours_aleatoires = random.randint(0, 365)
        date_v = (date_debut + timedelta(days=jours_aleatoires)).strftime('%Y-%m-%d')
        
        # Choisir des valeurs aléatoires
        reg = random.choice(regions)
        cat = random.choice(categories)
        qte = random.randint(1, 50)
        
        # Calculer un faux chiffre d'affaires (quantité * prix unitaire aléatoire)
        prix_unitaire = random.uniform(100.0, 5000.0)
        ca = round(qte * prix_unitaire, 2)

        # Insérer dans la base
        cursor.execute('''
            INSERT INTO ventes (date_vente, region, categorie_produit, quantite, chiffre_affaires)
            VALUES (?, ?, ?, ?, ?)
        ''', (date_v, reg, cat, qte, ca))

    # 5. Sauvegarder et fermer
    conn.commit()
    conn.close()
    print("Terminé ! Le fichier 'entreprise_test.db' a été créé avec succès.")

# Exécuter la fonction
if __name__ == '__main__':
    creer_base_de_donnees()