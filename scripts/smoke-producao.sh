#!/usr/bin/env bash
# Roda o smoke da automação de QA contra o site publicado, logo após o deploy.
# Espera o repositório rj-bank-qa-automation ao lado deste (../rj-bank-qa-automation).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QA_DIR="${QA_DIR:-$APP_DIR/../rj-bank-qa-automation}"

if [ ! -d "$QA_DIR" ]; then
  echo "⚠ Automação de QA não encontrada em $QA_DIR; smoke pulado."
  exit 0
fi
if [ ! -d "$QA_DIR/node_modules" ]; then
  echo "Instalando a automação de QA (só na primeira vez)..."
  (cd "$QA_DIR" && npm ci && npx playwright install chromium)
fi

# A chave web e o projeto saem do .env.local do app, para a limpeza dos dados de teste.
ler() { grep -E "^$1=" "$APP_DIR/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"' || true; }

cd "$QA_DIR"
BASE_URL="${BASE_URL:-https://cliente-app-1a979.web.app}" \
EXTERNAL_APIS=mock \
FIREBASE_API_KEY="$(ler VITE_FIREBASE_API_KEY)" \
FIREBASE_PROJECT_ID="$(ler VITE_FIREBASE_PROJECT_ID)" \
  npx playwright test --project=ui-desktop --grep @smoke --reporter=list
