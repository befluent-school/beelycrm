// Beely CRM — configuração PM2 (ver 00-padrao-vps.md: porta 3200, processo
// único — Next.js App Router faz o papel de frontend + backend, sem split
// como o BeeFlow). Roda como usuário deploy, só em 127.0.0.1 — Nginx é o
// único ponto de entrada público.
module.exports = {
  apps: [
    {
      name: "beely-web",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3200",
      instances: 1,
      max_memory_restart: "800M",
      env: { NODE_ENV: "production" },
    },
  ],
};
