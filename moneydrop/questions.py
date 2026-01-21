from __future__ import annotations

from .models import Question


def build_question_bank() -> list[Question]:
    """Banque de questions.

    Exigences :
    - 2 types : MUSIQUE et DROIT/INFORMATIQUE
    - Les questions droit/info sont STRICTEMENT dans les thèmes fournis.
    - Au moins une question exploite le tableau récapitulatif.
    """

    q: list[Question] = [
        # --- NIVEAU FACILE ---
        Question(
            category="DROIT/INFO",
            prompt="En France, le CODE SOURCE d'un logiciel est protégé par :",
            answers={
                "A": "Le Brevet industriel",
                "B": "Le Droit d'Auteur",
                "C": "Le Secret Défense",
                "D": "Le Droit des Marques",
            },
            correct="B",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Que signifie l'acronyme RGPD ?",
            answers={
                "A": "Règlement Global pour la Protection des Données",
                "B": "Régime Général de la Propriété des Données",
                "C": "Règlement Général sur la Protection des Données",
                "D": "Registre Gouvernemental des Preuves Digitales",
            },
            correct="C",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Le principe de 'Minimisation' (RGPD) impose de :",
            answers={
                "A": "Collecter le moins de données possible",
                "B": "Minimiser le coût du stockage",
                "C": "Réduire la taille de la base de données",
                "D": "Ne garder les données que 24h",
            },
            correct="A",
        ),

        # --- NIVEAU MOYEN ---
        Question(
            category="DROIT/INFO",
            prompt="Pour protéger la STRUCTURE d'une base de données par le droit d'auteur, elle doit être :",
            answers={
                "A": "Volumineuse",
                "B": "Originale",
                "C": "Rentable",
                "D": "Secrète",
            },
            correct="B",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Quel droit protège l'INVESTISSEMENT financier (le contenu) d'une base de données ?",
            answers={
                "A": "Le Droit Sui Generis",
                "B": "Le Droit à l'image",
                "C": "Le Copyright",
                "D": "Le Droit moral",
            },
            correct="A",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Une adresse IP ou un identifiant publicitaire sont-ils des Données Personnelles (DCP) ?",
            answers={
                "A": "Non, jamais",
                "B": "Oui, car ils permettent d'identifier indirectement",
                "C": "Seulement pour les personnes célèbres",
                "D": "Non, ce sont des données machines",
            },
            correct="B",
        ),

        # --- NIVEAU DIFFICILE ---
        Question(
            category="DROIT/INFO",
            prompt="J'ai le droit de créer un logiciel qui a exactement les mêmes fonctionnalités que Excel si :",
            answers={
                "A": "Je ne copie pas le code source",
                "B": "Je le distribue gratuitement",
                "C": "Je change le nom du logiciel",
                "D": "C'est strictement interdit",
            },
            correct="A",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Quelle est la durée de protection du droit Sui Generis (producteur BDD) ?",
            answers={
                "A": "70 ans après la mort de l'auteur",
                "B": "10 ans renouvelables",
                "C": "15 ans à compter de l'achèvement",
                "D": "Illimitée tant que la base existe",
            },
            correct="C",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Stocker des mots de passe 'en clair' (non chiffrés) est une violation de l'obligation de :",
            answers={
                "A": "Finalité",
                "B": "Transparence",
                "C": "Sécurité",
                "D": "Portabilité",
            },
            correct="C",
        ),

        # --- LA QUESTION QUI TUE (FINALE) ---
        Question(
            category="DROIT/INFO",
            prompt="Quelle est la sanction administrative MAXIMALE possible par la CNIL ?",
            answers={
                "A": "300 000 €",
                "B": "3 Millions €",
                "C": "10 Millions € ou 2% du CA",
                "D": "20 Millions € ou 4% du CA",
            },
            correct="D",
        ),
        # Variante à 2 choix pour la dernière question (exemple)
        Question(
            category="DROIT/INFO",
            prompt="(FINALE) Quelle est la sanction administrative MAXIMALE possible par la CNIL ?",
            answers={
                "A": "10 Millions € ou 2% du CA",
                "B": "20 Millions € ou 4% du CA",
            },
            correct="B",
        ),
    ]
            category="DROIT/INFO",
            prompt="Selon le tableau, la durée associée au droit sui generis (base - contenu) est :",
            answers={"A": "70 ans", "B": "15 ans", "C": "5 ans", "D": "Illimitée"},
            correct="B",
            explanation="Droit sui generis : 15 ans (liée à l'investissement).",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Qu'est-ce qu'une injection SQL ?",
            answers={
                "A": "Une technique de chiffrement de base de données",
                "B": "Une attaque consistant à insérer du SQL malveillant dans des entrées",
                "C": "Une méthode pour accélérer les requêtes",
                "D": "Un protocole réseau",
            },
            correct="B",
            explanation="Définition : injection de code SQL via une entrée non filtrée.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Quel exemple illustre une injection SQL (id = ...) ?",
            answers={
                "A": "id=42",
                "B": "id=1; DROP TABLE users;--",
                "C": "id=abc",
                "D": "id=2025-01-21",
            },
            correct="B",
            explanation="Exemple classique : terminaison de requête + commande + commentaire.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Parmi ces droits RGPD, lequel correspond à la 'portabilité' ?",
            answers={
                "A": "Obtenir ses données dans un format structuré et les transmettre à un autre service",
                "B": "Supprimer toutes les données sur Internet",
                "C": "Interdire toute collecte de données pour toujours",
                "D": "Obtenir l'accès au code source du site",
            },
            correct="A",
            explanation="Portabilité : récupérer et transférer ses données.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Le principe RGPD de 'minimisation' signifie :",
            answers={
                "A": "Collecter le maximum de données au cas où",
                "B": "Collecter uniquement les données nécessaires à la finalité",
                "C": "Partager les données avec tous les partenaires",
                "D": "Anonymiser systématiquement toutes les données",
            },
            correct="B",
            explanation="Minimisation : adéquates, pertinentes, limitées à la finalité.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Dans le droit d'auteur appliqué au logiciel, qu'est-ce qui N'est PAS protégé ?",
            answers={
                "A": "Le code source",
                "B": "Le code objet",
                "C": "Les idées / fonctionnalités / algorithmes",
                "D": "Le matériel préparatoire",
            },
            correct="C",
            explanation="Le droit d'auteur protège l'expression (ex. code), pas les idées/algorithmes en tant que tels.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="La protection des bases de données peut concerner :",
            answers={
                "A": "Uniquement la structure (jamais le contenu)",
                "B": "Uniquement le contenu (jamais la structure)",
                "C": "La structure (droit d'auteur si originalité) et le contenu (sui generis si investissement)",
                "D": "Aucun des deux",
            },
            correct="C",
            explanation="Double régime possible : structure (originalité) / contenu (investissement).",
        ),
        Question(
            category="DROIT/INFO",
            prompt="RGPD : les données personnelles concernent principalement :",
            answers={
                "A": "Les personnes morales",
                "B": "Les personnes physiques",
                "C": "Uniquement les mineurs",
                "D": "Uniquement les employés",
            },
            correct="B",
            explanation="Le RGPD protège les personnes physiques via leurs données personnelles.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Quel est l'ordre de grandeur maximal des sanctions RGPD cité dans le cours ?",
            answers={"A": "2 M€ / 1% CA", "B": "5 M€ / 2% CA", "C": "20 M€ / 4% CA", "D": "200 M€ / 10% CA"},
            correct="C",
            explanation="Sanctions : jusqu'à 20 M€ ou 4% du CA annuel mondial.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="APP (Agence pour la Protection des Programmes) est associée à :",
            answers={
                "A": "La protection des logiciels (preuves, dépôts, etc.)",
                "B": "L'hébergement cloud",
                "C": "La certification RGPD",
                "D": "Le chiffrement des bases",
            },
            correct="A",
            explanation="L'APP intervient notamment pour la protection des logiciels (dépôt probatoire, etc.).",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Le principe RGPD de 'finalité' impose :",
            answers={
                "A": "Une collecte sans objectif défini",
                "B": "Une collecte pour des objectifs déterminés, explicites et légitimes",
                "C": "Une collecte uniquement hors UE",
                "D": "Une collecte uniquement anonymisée",
            },
            correct="B",
            explanation="Finalité : objectifs déterminés/explicites/légitimes.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Évolution des risques (2011 vs 2025) : l'augmentation est surtout liée à :",
            answers={
                "A": "La disparition totale des bases de données",
                "B": "La baisse des attaques web",
                "C": "La généralisation des applis web/API et de la donnée, augmentant la surface d'attaque (ex. injection SQL)",
                "D": "L'arrêt des langages SQL",
            },
            correct="C",
            explanation="Plus de services web + API + données = plus de surface d'attaque et d'impact.",
        ),
        Question(
            category="DROIT/INFO",
            prompt="Dans le tableau, 'Données personnelles' → RGPD → protège surtout :",
            answers={
                "A": "Vie privée, limitée à la finalité",
                "B": "Originalité, 70 ans",
                "C": "Investissement, 15 ans",
                "D": "Secret industriel, illimité",
            },
            correct="A",
            explanation="Le tableau indique : RGPD, vie privée, limitée à la finalité.",
        ),
    ]

    return q
