# Notificações push — servidor (Cloudflare Workers)

Este Worker é só um "despertador": ele guarda a agenda de lembretes (que o app
calcula no seu aparelho) e dispara o push na hora certa. **Nenhum dado do ciclo ou
de humor passa por aqui** — só um horário e um código.

---

## O que VOCÊ precisa fazer (2 passos, sem programar)

1. **Criar uma conta grátis na Cloudflare** — https://dash.cloudflare.com/sign-up
   (e-mail + senha, ~2 min, sem cartão de crédito).

2. **Autorizar o deploy uma vez.** Abra o terminal na pasta `cloudflare` e rode:
   ```
   npx wrangler login
   ```
   Vai abrir o navegador → clique em **Allow**. Pronto. A autorização fica salva
   na máquina.

Depois disso, me avise — **eu faço o resto** (os comandos abaixo) a partir do seu
terminal, já que tenho a chave privada e os scripts prontos.

---

## O que EU faço depois do seu "ok" (referência)

```bash
cd cloudflare
npm install

# 1) cria o banco de chaves (KV) e cola o id no wrangler.toml
npx wrangler kv namespace create SCHEDULES
#   -> copiar o "id" retornado para o campo id em wrangler.toml

# 2) guarda a chave VAPID privada como segredo (cola quando pedir)
npx wrangler secret put VAPID_PRIVATE
#   valor: j1AE9tvF3BbjIRJBnJL_OGSUjTAI1Bonm-1KivSkutY

# 3) publica o Worker
npx wrangler deploy
#   -> anota a URL: https://ciclo-push.<seu-subdominio>.workers.dev
```

Por fim, coloco essa URL no app (constante `PUSH_API` em
`src/lib/notifications.ts`) e dou push — o app passa a enviar a agenda para o
Worker, e os lembretes chegam **com o app fechado**.

---

## Importante
- **A chave privada VAPID é secreta.** Ela já está fora do código (só aqui no
  passo a passo e como segredo no Cloudflare). Se vazar, dá para gerar outra.
- O plano grátis da Cloudflare cobre de sobra (Workers + KV + Cron).
- **iPhone:** o push só funciona com o app **instalado** na tela de início (iOS 16.4+).
- **Antes de configurar isto**, as notificações já funcionam como _fallback local_:
  aparecem quando a usuária abre o app. O Worker é o que faz chegarem com o app
  fechado.
