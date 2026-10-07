#!/usr/bin/env bash
# ============================================================
# Beely CRM — deploy/rollout (zero-downtime via pm2 reload).
# Rode como usuário deploy, dentro de /var/www/beely:
#   bash deploy/update.sh
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Backup antes de atualizar"
bash deploy/backup.sh

echo "==> Git pull"
git pull --ff-only

echo "==> Instalando dependências"
npm ci

echo "==> Aplicando migrations do banco"
npm run db:migrate

echo "==> Build de produção"
npm run build

echo "==> Reload do processo (zero-downtime)"
pm2 reload deploy/ecosystem.config.cjs --update-env

echo "==> Concluído."
