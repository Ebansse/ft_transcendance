#!/usr/bin/env bash
#
# Gère le lancement du projet (backend + frontend).
#
# Usage :
#   ./dev.sh start    -> lance backend + frontend
#   ./dev.sh stop     -> arrête tout (backend, frontend, et le conteneur Postgres via spring-boot-docker-compose)
#   ./dev.sh restart  -> stop puis start
#
# Logs  : ./logs/backend.log et ./logs/front.log
# PID   : ./.pids/

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONT_DIR="$ROOT_DIR/front"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONT_PID_FILE="$PID_DIR/front.pid"

is_running() {
    local pid="$1"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start_one() {
    local name="$1" dir="$2" cmd="$3" pid_file="$4" log_file="$5"

    if [ -f "$pid_file" ] && is_running "$(cat "$pid_file")"; then
        echo "$name déjà lancé (PID $(cat "$pid_file"))"
        return
    fi

    echo "Démarrage de $name..."
    (
        cd "$dir"
        setsid bash -c "$cmd" > "$log_file" 2>&1 &
        echo $! > "$pid_file"
    )
    sleep 1
    echo "  -> $name PID $(cat "$pid_file"), logs: $log_file"
}

stop_one() {
    local name="$1" pid_file="$2"

    if [ ! -f "$pid_file" ]; then
        echo "$name n'est pas lancé."
        return
    fi

    local pid pgid
    pid="$(cat "$pid_file")"

    if is_running "$pid"; then
        pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
        echo "Arrêt de $name (PID $pid)..."
        [ -n "$pgid" ] && kill -TERM -- "-$pgid" 2>/dev/null
        kill -TERM "$pid" 2>/dev/null

        for _ in $(seq 1 15); do
            is_running "$pid" || break
            sleep 1
        done

        if is_running "$pid"; then
            echo "  $name ne répond pas, arrêt forcé..."
            [ -n "$pgid" ] && kill -9 -- "-$pgid" 2>/dev/null
            kill -9 "$pid" 2>/dev/null
        fi
    else
        echo "$name n'était plus en cours d'exécution."
    fi

    rm -f "$pid_file"
}

start() {
    start_one "Backend"  "$BACKEND_DIR" "./mvnw spring-boot:run" "$BACKEND_PID_FILE" "$LOG_DIR/backend.log"
    start_one "Frontend" "$FRONT_DIR"   "npm run dev"            "$FRONT_PID_FILE"   "$LOG_DIR/front.log"
    echo ""
    echo "Backend  : http://localhost:8080"
    echo "Frontend : http://localhost:5173"
    echo "Logs     : $LOG_DIR/ (tail -f logs/backend.log logs/front.log)"
}

stop() {
    stop_one "Frontend" "$FRONT_PID_FILE"
    stop_one "Backend"  "$BACKEND_PID_FILE"
}

restart() {
    stop
    sleep 2
    start
}

case "${1-}" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
