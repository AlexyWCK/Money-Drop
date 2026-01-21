from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from moneydrop.engine import MoneyDropEngine
from moneydrop.leaderboard import Leaderboard
from moneydrop.models import GameConfig
from moneydrop.questions import build_question_bank
from moneydrop.session import GameSession, SessionManager


BASE_DIR = Path(__file__).resolve().parent


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=str(BASE_DIR / "web" / "templates"),
        static_folder=str(BASE_DIR / "web" / "static"),
    )
    app.secret_key = os.environ.get("MONEYDROP_SECRET", "dev-secret-change-me")

    leaderboard = Leaderboard(str(BASE_DIR / "data" / "leaderboard.json"))
    engine = MoneyDropEngine(build_question_bank())
    sessions = SessionManager()
    lobbies = LobbyManager()
    config = GameConfig(starting_chips=1000, question_count=7, allow_unbet_chips=True)

    def _require_session() -> tuple[str, GameSession]:
        sid = session.get("sid")
        if not sid:
            raise ValueError("no-session")
        game = sessions.get(sid)
        if not game:
            raise ValueError("unknown-session")
        return sid, game

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.post("/start")
    def start():
        name = (request.form.get("name") or "").strip()
        if not name:
            return render_template("index.html", error="Veuillez entrer un nom."), 400

        game = GameSession(engine=engine, player_name=name, config=config)
        sid = sessions.create(game)
        session["sid"] = sid
        return redirect(url_for("play"))

    @app.get("/play")
    def play():
        try:
            _require_session()
        except Exception:
            return redirect(url_for("index"))
        return render_template("play.html")

    # --- Lobby endpoints ---
    @app.post("/lobby/create")
    def lobby_create():
        sid = session.get("sid")
        if not sid:
            return jsonify({"ok": False, "error": "no-session"}), 400
        data = request.form or request.get_json() or {}
        size = int(data.get("size", 2))
        time_limit = int(data.get("time_limit", 30))

        game = sessions.get(sid)
        if not game:
            return jsonify({"ok": False, "error": "unknown-session"}), 400

        import secrets

        lobby_id = secrets.token_urlsafe(8)
        creator = LobbyPlayer(session_id=sid, name=game.player.name, chips=game.player.chips)
        try:
            lobby = lobbies.create(lobby_id, engine, config, size, creator, time_limit=time_limit)
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

        return jsonify({"ok": True, "lobby_id": lobby_id})

    @app.post("/lobby/join")
    def lobby_join():
        sid = session.get("sid")
        if not sid:
            return jsonify({"ok": False, "error": "no-session"}), 400
        data = request.form or request.get_json() or {}
        lobby_id = data.get("lobby_id")
        if not lobby_id:
            return jsonify({"ok": False, "error": "missing lobby_id"}), 400
        game = sessions.get(sid)
        if not game:
            return jsonify({"ok": False, "error": "unknown-session"}), 400

        lobby = lobbies.get(lobby_id)
        if not lobby:
            return jsonify({"ok": False, "error": "unknown-lobby"}), 404

        try:
            lobby.join(LobbyPlayer(session_id=sid, name=game.player.name, chips=game.player.chips))
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

        return jsonify({"ok": True, "lobby_id": lobby_id})

    @app.post("/lobby/start")
    def lobby_start():
        sid = session.get("sid")
        data = request.form or request.get_json() or {}
        lobby_id = data.get("lobby_id")
        if not lobby_id:
            return jsonify({"ok": False, "error": "missing lobby_id"}), 400
        lobby = lobbies.get(lobby_id)
        if not lobby:
            return jsonify({"ok": False, "error": "unknown-lobby"}), 404

        try:
            lobby.start()
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400
        return jsonify({"ok": True})

    @app.get("/lobby/state")
    def lobby_state():
        sid = session.get("sid")
        lobby_id = request.args.get("lobby_id")
        if not sid or not lobby_id:
            return jsonify({"ok": False, "error": "missing"}), 400
        lobby = lobbies.get(lobby_id)
        if not lobby:
            return jsonify({"ok": False, "error": "unknown-lobby"}), 404
        return jsonify({"ok": True, "state": lobby.player_view(sid)})

    @app.post("/lobby/bet")
    def lobby_bet():
        sid = session.get("sid")
        data = request.get_json(force=True, silent=True) or {}
        lobby_id = data.get("lobby_id")
        if not sid or not lobby_id:
            return jsonify({"ok": False, "error": "missing"}), 400
        lobby = lobbies.get(lobby_id)
        if not lobby:
            return jsonify({"ok": False, "error": "unknown-lobby"}), 404

        bets = {k: int(data.get(k, 0)) for k in ["A", "B", "C", "D"]}
        try:
            lobby.submit(sid, bets)
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

        return jsonify({"ok": True, "state": lobby.player_view(sid)})

    @app.post("/reset")
    def reset():
        sid = session.get("sid")
        if sid:
            sessions.delete(sid)
        session.pop("sid", None)
        return redirect(url_for("index"))

    @app.get("/api/state")
    def api_state():
        sid, game = _require_session()
        q = game.current_question()

        payload = {
            "player": {"name": game.player.name, "chips": game.player.chips},
            "progress": {"index": game.index, "total": len(game.questions)},
            "finished": bool(game.finished),
            "eliminated": bool(game.eliminated),
            "leaderboard": leaderboard.top(10),
        }

        if q is None:
            result = game.result()
            leaderboard.update(result.player_name, result.final_chips, result.correct_answers)
            payload["result"] = {
                "final_chips": result.final_chips,
                "correct_answers": result.correct_answers,
                "questions_played": result.questions_played,
            }
            payload["leaderboard_text"] = leaderboard.render(10)
            return jsonify(payload)

        payload["question"] = {
            "category": q.category,
            "prompt": q.prompt,
            "answers": q.answers,
        }
        return jsonify(payload)

    @app.post("/api/bet")
    def api_bet():
        sid, game = _require_session()
        data = request.get_json(force=True, silent=True) or {}

        def _to_int(x):
            try:
                return int(x)
            except Exception:
                return 0

        bets = {
            "A": _to_int(data.get("A", 0)),
            "B": _to_int(data.get("B", 0)),
            "C": _to_int(data.get("C", 0)),
            "D": _to_int(data.get("D", 0)),
        }

        try:
            resolution = game.submit_bets(bets)
        except ValueError as e:
            return jsonify({"ok": False, "error": str(e)}), 400

        # Si fin après cette réponse : mise à jour classement
        if game.finished or game.eliminated:
            result = game.result()
            leaderboard.update(result.player_name, result.final_chips, result.correct_answers)

        return jsonify(
            {
                "ok": True,
                "resolution": {
                    "correct": resolution.correct,
                    "correct_label": resolution.correct_label,
                    "kept": resolution.kept,
                    "lost": resolution.lost,
                    "bet_total": resolution.bet_total,
                    "unbet": resolution.unbet,
                    "explanation": resolution.explanation,
                    "correct_bet": resolution.correct_bet,
                },
                "player": {"chips": game.player.chips},
                "finished": bool(game.finished),
                "eliminated": bool(game.eliminated),
                "leaderboard_text": leaderboard.render(10),
            }
        )

    @app.get("/api/leaderboard")
    def api_leaderboard():
        return jsonify({"text": leaderboard.render(10)})

    return app


if __name__ == "__main__":
    app = create_app()
    host = os.environ.get("MONEYDROP_HOST", "127.0.0.1")
    port = int(os.environ.get("MONEYDROP_PORT", "8000"))
    app.run(host=host, port=port, debug=True, threaded=True)
