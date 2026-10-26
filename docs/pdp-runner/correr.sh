#!/usr/bin/env bash
# Uso: correr.sh <host> <archivo-encargo> <salida.json> [modelo]
# Una corrida del extractor. El cerco (PDP_HOST) y la salida (PDP_OUT) van por entorno a las herramientas.
set -uo pipefail
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a
export PDP_HOST="$1" PDP_OUT="$3"
MODELO="${4:-${PDP_MODELO:-github-copilot/claude-sonnet-5}}"
rm -f "$PDP_OUT"
timeout "${PDP_TIMEOUT_S:-900}" ~/.opencode/bin/opencode run --agent pdp -m "$MODELO" --format json "$(cat "$2")" </dev/null
