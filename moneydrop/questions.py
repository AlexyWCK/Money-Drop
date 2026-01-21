from __future__ import annotations

from .models import Question


def build_question_bank() -> list[Question]:
    """Banque de questions.

    Exigences :
    - 2 types : MUSIQUE et DROIT/INFORMATIQUE
    - Les questions droit/info sont STRICTEMENT dans les thèmes fournis.
    - Au moins une question exploite le tableau récapitulatif.
    """

    q: list[Question] = []

    # --- MUSIQUE ---
    q += [
        Question(
            category="MUSIQUE",
            prompt="Qui est l'artiste de la chanson 'Rolling in the Deep' ?",
            answers={
                "A": "Adele",
                "B": "Rihanna",
                "C": "Beyoncé",
                "D": "Amy Winehouse",
            },
            correct="A",
            explanation="'Rolling in the Deep' est un titre d'Adele (2010).",
        ),
        Question(
            category="MUSIQUE",
            prompt="En quelle année est sorti l'album 'Random Access Memories' (Daft Punk) ?",
            answers={"A": "2007", "B": "2011", "C": "2013", "D": "2016"},
            correct="C",
            explanation="Sorti en 2013.",
        ),
        Question(
            category="MUSIQUE",
            prompt="Quel genre est le plus souvent associé au groupe Metallica ?",
            answers={
                "A": "Jazz",
                "B": "Metal",
                "C": "Reggae",
                "D": "House",
            },
            correct="B",
            explanation="Metallica est un groupe de heavy metal/thrash metal.",
        ),
        Question(
            category="MUSIQUE",
            prompt="Quelle artiste est connue pour la chanson 'Bad Guy' ?",
            answers={"A": "Billie Eilish", "B": "Dua Lipa", "C": "Sia", "D": "Madonna"},
            correct="A",
            explanation="'Bad Guy' est un hit de Billie Eilish (2019).",
        ),
        Question(
            category="MUSIQUE",
            prompt="Quel instrument est au cœur d'un "
            "morceau de 'piano solo' ?",
            answers={"A": "Guitare", "B": "Saxophone", "C": "Piano", "D": "Batterie"},
            correct="C",
            explanation="Par définition : piano solo = piano.",
        ),
    ]

    # --- DROIT / INFORMATIQUE (strictement thèmes fournis) ---
    q += [
        Question(
            category="DROIT/INFO",
            prompt="Dans le tableau récapitulatif, la 'Base (contenu)' est protégée par :",
            answers={
                "A": "Droit d'auteur (structure)",
                "B": "Droit sui generis (contenu)",
                "C": "RGPD", 
                "D": "Aucune protection",
            },
            correct="B",
            explanation="Le contenu d'une base peut relever du droit sui generis (investissement), durée 15 ans.",
        ),
        Question(
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
