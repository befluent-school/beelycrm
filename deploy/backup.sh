#!/usr/bin/env bash
# ============================================================
# Beely CRM — backup diário (pg_dump + agendado no crontab do
# usuário deploy, ver deploy/crontab.txt).
# ============================================================
set -euo pipefail

DEST=/var/backups/beely
STAMP=$(date +%Y-%m-%d_%H%M)
DATABASE_URL=$(grep -E '^DATABASE_URL=' /var/www/beely/.env | cut -d= -f2- | tr -d '"')

mkdir -p "$DEST"
pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DEST/db_$STAMP.dump"

# Retenção de 14 dias — cópia externa (rclone) é feita pelo backup
# consolidado em INFRA_VPS/backup/backup-todos.sh, não aqui.
find "$DEST" -name 'db_*.dump' -mtime +14 -delete

echo "Backup do Beely concluído: $DEST/db_$STAMP.dump"
