# Money Drop (console multijoueur)

Jeu inspiré de l’émission TV : vous répartissez vos jetons sur **A/B/C/D** à chaque question.
Les jetons sur les mauvaises réponses sont perdus, ceux sur la bonne réponse sont conservés.

## Pré-requis

- Python 3.10+ recommandé

## Lancer le serveur (multijoueur, threads)

Dans un terminal :

```bash
python3 server.py --host 127.0.0.1 --port 5050
```

Le serveur accepte plusieurs joueurs en parallèle : **1 client = 1 thread**.
Le classement est partagé et protégé par verrou (thread-safe) et sauvegardé dans `data/leaderboard.json`.

## Lancer un client (un joueur)

Dans un autre terminal :

```bash
python3 client.py --host 127.0.0.1 --port 5050
```

Pour jouer à plusieurs, ouvrez plusieurs terminaux et lancez plusieurs clients.

## Format des mises

Exemples valides :

- `A=200 B=300 C=0 D=50`
- `A 200 B 300 C 0 D 50`

La somme des mises doit être **≤** aux jetons disponibles.

## Paramètres utiles

- Jetons de départ : `python3 server.py --start 1500`
- Nombre de questions : `python3 server.py --questions 10`
- Fichier classement : `python3 server.py --leaderboard data/leaderboard.json`

## Notes

- Les questions de droit/informatique respectent les thèmes fournis (RGPD, bases de données, injection SQL, APP, etc.)
- Les questions sont mélangées aléatoirement à chaque partie.
