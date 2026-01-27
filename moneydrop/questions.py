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
            correct="B",)

    ]

    return q