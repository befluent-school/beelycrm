#!/usr/bin/env bash
# ============================================================
# Beely CRM — migração de dados do Supabase para o Postgres da VPS.
#
# ⚠️  NÃO rode este script sem ter autorização explícita do dono do
#     projeto para conectar na instância de produção do Supabase.
#     Ele só LÊ de lá (pg_dump), nunca escreve, mas ainda assim é
#     uma conexão real a um sistema de produção.
#
# Uso:
#   SUPABASE_DB_URL="postgresql://postgres:[SENHA]@db.xxx.supabase.co:5432/postgres" \
#   BEELY_DB_URL="postgresql://beely:[SENHA]@127.0.0.1:5432/beely_crm" \
#   bash deploy/migrate-from-supabase.sh
#
# O que faz:
#   1. pg_dump do schema "public" do Supabase (só dados — o schema de
#      destino já deve existir via `npm run db:migrate`, que usa as
#      migrations Drizzle versionadas, não o dump do Supabase).
#   2. Restaura os dados no banco da VPS.
#   3. Relatório de contagem de linhas por tabela, nos dois lados, para
#      conferência manual antes de confiar na migração.
#
# auth.users (Supabase Auth) fica DE FORA deste script — veja a seção
# "Migração de usuários" no plano (03-beely-crm.md): requer passo manual
# de exportar auth.users preservando hashes bcrypt e importar em `users`
# com um script à parte (users.passwordHash aceita texto, mas o formato
# bcrypt do Supabase não é o scrypt que o Beely usa — login com bcrypt
# precisa de um caminho de verificação extra no login, não implementado
# ainda; decida com o usuário antes de escrever isso).
# ============================================================
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ] || [ -z "${BEELY_DB_URL:-}" ]; then
  echo "Defina SUPABASE_DB_URL e BEELY_DB_URL antes de rodar este script." >&2
  exit 1
fi

read -p "Confirma que tem autorização para conectar no Supabase de PRODUÇÃO agora? (digite 'sim'): " CONFIRM
if [ "$CONFIRM" != "sim" ]; then
  echo "Abortado."
  exit 1
fi

DUMP_FILE="/tmp/beely-supabase-$(date +%Y%m%d_%H%M%S).dump"

echo "==> Dump do Supabase (só dados, schema public)"
pg_dump --data-only --no-owner --format=custom \
  --exclude-table-data='auth.*' \
  "$SUPABASE_DB_URL" > "$DUMP_FILE"

echo "==> Restaurando no Postgres da VPS (schema já deve existir via db:migrate)"
pg_restore --data-only --no-owner --disable-triggers \
  --dbname="$BEELY_DB_URL" "$DUMP_FILE"

echo
echo "==> Relatório de contagem de linhas (confira antes de confiar na migração)"
TABELAS="pipelines deals contacts activities companies automations scoring_rules sdrs inbox_messages scripts"
for t in $TABELAS; do
  ORIGEM=$(psql "$SUPABASE_DB_URL" -tAc "select count(*) from $t" 2>/dev/null || echo "erro")
  DESTINO=$(psql "$BEELY_DB_URL" -tAc "select count(*) from $t" 2>/dev/null || echo "erro")
  printf "%-30s supabase=%-8s vps=%-8s %s\n" "$t" "$ORIGEM" "$DESTINO" "$([ "$ORIGEM" = "$DESTINO" ] && echo OK || echo "⚠ DIVERGENTE")"
done

echo
echo "Dump salvo em $DUMP_FILE — guarde fora da VPS antes de apagar."
