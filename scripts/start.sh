#!/usr/bin/env bash
set -euo pipefail

# Start script for Money Drop (socket server + web app)
# Usage: ./scripts/start.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[moneydrop] Starting from $ROOT"

# create venv if missing
if [ ! -d .venv ]; then
  echo "Creating virtualenv .venv..."
  python3 -m venv .venv
fi

echo "Activating venv and installing requirements (if needed)..."
. .venv/bin/activate
python3 -m pip install --upgrade pip setuptools wheel >/dev/null 2>&1 || true
pip install -r requirements.txt >/dev/null 2>&1 || true

# stop previous instances if any
if [ -f /tmp/md_server.pid ]; then
  old=$(cat /tmp/md_server.pid)
  if kill -0 "$old" 2>/dev/null; then
    echo "Stopping old server pid $old"
    kill "$old" || true
    sleep 0.2
  fi
  rm -f /tmp/md_server.pid
fi
if [ -f /tmp/md_web.pid ]; then
  old=$(cat /tmp/md_web.pid)
  if kill -0 "$old" 2>/dev/null; then
    echo "Stopping old web pid $old"
    kill "$old" || true
    sleep 0.2
  fi
  rm -f /tmp/md_web.pid
fi

echo "Starting socket server (server.py) on 0.0.0.0:5050..."
nohup .venv/bin/python3 server.py --host 0.0.0.0 --port 5050 > /tmp/md_server.log 2>&1 &
echo $! > /tmp/md_server.pid

WEB_PORT=${MONEYDROP_PORT:-8001}
export MONEYDROP_PORT="$WEB_PORT"
export MONEYDROP_HOST="0.0.0.0"
echo "Starting web app (web_app.py) on http://0.0.0.0:$WEB_PORT ..."
nohup .venv/bin/python3 web_app.py > /tmp/md_web.log 2>&1 &
echo $! > /tmp/md_web.pid

echo "Started."
echo "Socket server log: /tmp/md_server.log (pid $(cat /tmp/md_server.pid))"
echo "Web log: /tmp/md_web.log (pid $(cat /tmp/md_web.pid))"
# Afficher l'IP locale pour que les autres puissent se connecter
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 Accédez au serveur via: http://$LOCAL_IP:$WEB_PORT"
echo "💡 Partagez cette adresse IP avec vos amis pour qu'ils se connectent à distance!"

exit 0
