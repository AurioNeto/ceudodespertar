# Céu do Despertar — Sistema de Gestão

Front-end do sistema, implementado a partir do handoff de design que está em
`project/`. Segue o método do Doc 1 §8.1 — design → front-end (com mocks) →
backend: as telas existem em React com fixtures tipadas, e o backend
implementa depois os contratos de `packages/contracts`.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + build de produção
pnpm typecheck
```

| Onde | O que é |
|---|---|
| `apps/web/src/ds` | Design system em TSX, portado do bundle exportado |
| `apps/web/src/styles/tokens` | Tokens do design system — a fonte da verdade visual |
| `apps/web/src/pages` | As 13 telas |
| `apps/web/src/mocks` | Fixtures tipadas; saem quando o backend entrar |
| `packages/contracts` | Tipos do domínio e read models (Doc 2 e Doc 3) |
| `project/` | O bundle de design original, mantido como referência |

O que ainda não existe: backend (NestJS + MikroORM + PostgreSQL), Keycloak e
os testes. A sessão do usuário e as permissões são fixtures.

## Ambiente local

Postgres 16 (com os papéis de cluster do Doc 7 §8), MinIO/SeaweedFS, Mailpit
e Keycloak 26 via Docker Compose:

```bash
cp .env.example .env
pnpm infra:subir    # sobe tudo e espera ficar saudável
pnpm db:verificar   # aplica o esquema de referência e roda os 113 casos
pnpm infra:descer   # para os containers, mantém os dados
pnpm infra:zerar    # para e apaga os volumes
```

| Serviço | Porta | Uso |
|---|---|---|
| Postgres | `127.0.0.1:${POSTGRES_PORTA:-5432}` | `BANCO_URL` (papel `cdd_app`) e `BANCO_URL_MIGRACAO` (papel `cdd_owner`) |
| MinIO/SeaweedFS (S3) | `127.0.0.1:9000` | `S3_ENDPOINT`, bucket `cdd-anexos`, com IAM (credencial obrigatória) |
| Mailpit | `127.0.0.1:8025` (UI), `127.0.0.1:1025` (SMTP) | e-mails de convite/redefinição de senha do Keycloak |
| Keycloak | `127.0.0.1:8080` | Console admin (`/admin`, usuário `admin`/`KEYCLOAK_ADMIN_SENHA`); realm `cdd` (`OIDC_EMISSOR`) |

Todas as portas ficam só em `127.0.0.1`: nada aqui tem senha forte o
suficiente para escutar na rede. O filer do SeaweedFS (porta 8888) não é
publicado — sua API HTTP aceita leitura, escrita e exclusão sem credencial,
mesmo com o `s3.json` configurado na API S3 (9000). A porta de gestão do
Keycloak (9000, `/health/*`) também não é publicada — nesta máquina a 9000
já é do SeaweedFS; o healthcheck do Keycloak fala com ela de dentro do
próprio container.

O realm `cdd` (`infra/keycloak/realm-cdd.json`) é versionado e importado a
cada subida (`--import-realm`); nenhum segredo fica em claro nele — o
segredo do client de serviço `cdd-api-admin` e a senha do usuário de
desenvolvimento (`dev@cdd.local`) chegam por placeholder de variável de
ambiente (`CDD_KC_ADMIN_SEGREDO`, `CDD_KC_DEV_SENHA`), substituído pelo
próprio Keycloak no import.

```bash
node infra/keycloak/verificar-realm.mjs   # falha se alguma regra de segurança do realm regredir
bash infra/keycloak/fumaca.sh             # com o compose de pé: discovery, token do cdd-teste, cdd-web recusa password grant
```

---

## Handoff original do Claude Design

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 3 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Find the primary design file under `project/` and read it top to bottom.** The chat transcripts will tell you which file the user was last iterating on. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `Dashboard inicial e fila simplificada` project files (HTML prototypes, assets, components)
