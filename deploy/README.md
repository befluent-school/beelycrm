# Beely CRM — Deploy na VPS

Pressupõe que o servidor já foi preparado pelo
`INFRA_VPS/setup-servidor.sh` (Node 22, PostgreSQL 16, Nginx, Certbot, PM2,
usuário `deploy`, pastas `/var/www/beely`, `/var/lib/beely`,
`/var/backups/beely`) e que `INFRA_VPS/postgres/criar-bancos.sql` já criou
o banco `beely_crm` e o usuário `beely`.

## 1. Clonar o repositório

```bash
# logado como deploy
cd /var/www
git clone <url-do-repo> beely
cd beely
```

## 2. Configurar o `.env`

```bash
cp .env.example .env
nano .env   # preencha DATABASE_URL, APP_SECRET, CRON_SECRET, DEBUG_ADMIN_SECRET, etc.
chmod 600 .env
```

Gere segredos fortes:
```bash
openssl rand -hex 32   # APP_SECRET
openssl rand -hex 24   # CRON_SECRET, DEBUG_ADMIN_SECRET
```

`DATABASE_URL` aponta para o Postgres local criado pelo
`INFRA_VPS/postgres/criar-bancos.sql`:
```
DATABASE_URL=postgresql://beely:SENHA_REAL@127.0.0.1:5432/beely_crm
```

## 3. Instalar dependências e aplicar o schema

```bash
npm ci
npm run db:migrate   # aplica as migrations do drizzle/ — cria as 33 tabelas
```

## 4. Build e primeiro start

```bash
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # siga a instrução impressa para o PM2 sobreviver a reboot
```

## 5. Nginx + HTTPS

```bash
sudo cp deploy/nginx-beely.conf /etc/nginx/sites-available/beely
sudo ln -s /etc/nginx/sites-available/beely /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.befluentschool.com.br
```

## 6. Crons (follow-up automático, backup)

```bash
crontab -e   # cole o conteúdo de deploy/crontab.txt, com o CRON_SECRET real
```

## 7. Login com Google (opcional, mas recomendado)

No Google Cloud Console, no mesmo projeto usado para o Gmail/Calendar (ou
um novo):
1. Credentials → Create OAuth client ID → tipo "Web application"
2. Authorized redirect URI: `https://crm.befluentschool.com.br/auth/callback`
3. Copie Client ID/Secret para `GOOGLE_LOGIN_CLIENT_ID`/`_SECRET` no `.env`
4. `pm2 reload deploy/ecosystem.config.cjs --update-env`

## 8. Migrar dados do Supabase (se aplicável)

Ver `deploy/migrate-from-supabase.sh` — script interativo, pede
confirmação antes de conectar em produção. Não migra usuários
automaticamente (ver comentário no topo do script); combine com o dono do
projeto antes de rodar essa parte.

## 9. Testar

- `https://crm.befluentschool.com.br/login` carrega
- Login com e-mail/senha e com Google funcionam
- Pipeline, contatos, importação de leads, automações funcionam
- `pm2 logs beely-web` sem erros

## Atualizações futuras

```bash
cd /var/www/beely
bash deploy/update.sh
```

Isso faz backup → `git pull` → `npm ci` → `db:migrate` → `build` →
`pm2 reload` (zero-downtime).

## Multi-sistema na mesma VPS

Este sistema ocupa a porta **3200** e o banco **beely_crm** / usuário
**beely** — ver a tabela de alocação completa em
`INFRA_VPS/README.md` e `00-padrao-vps.md` (no repositório BeeFlow) antes
de subir outro sistema na mesma VPS.
