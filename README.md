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

O realm `cdd` (`infra/keycloak/realm-cdd.json`) é versionado e importado quando
o container é criado (`--import-realm`); depois de editar o JSON, rode
`pnpm infra:descer && pnpm infra:subir`. Nenhum segredo fica em claro nele — o
segredo do client de serviço `cdd-api-admin` e a senha do usuário de
desenvolvimento (`dev@cdd.local`) chegam por placeholder de variável de
ambiente (`CDD_KC_ADMIN_SEGREDO`, `CDD_KC_DEV_SENHA`), substituído pelo
próprio Keycloak no import.

O `cdd-web` usa redirect por origem fixa com caminho em curinga
(`http://localhost:5173/*`), não um redirect exato — a origem
(`localhost:5173`) é travada, só o caminho depois dela é livre.

Os três clients da aplicação (`cdd-web`, `cdd-teste`, `cdd-api-admin`) declaram
`fullScopeAllowed: false` — nenhum papel de realm ou de outro client entra no
token por tabela, só o que estiver explicitamente no escopo. A conta de serviço
do `cdd-api-admin` continua enxergando `manage-users` de `realm-management`
porque o realm declara esse único `scope-mapping` (`clientScopeMappings` no
JSON, não um passo manual pela Admin API depois do import) — sem ele,
`fullScopeAllowed: false` apagaria esse papel do token da própria conta de
serviço e quebraria a única coisa para que ela existe.

`admin-cli` é declarado por completo no realm (representação real, obtida ao
vivo num Keycloak 26.4.7 descartável) sem `offline_access` no escopo
opcional — é o único dos clients embutidos do Keycloak com `fullScopeAllowed`
e password grant (ROPC) ligados por padrão, então é o que mais importava
fechar. Os outros cinco clients embutidos (`account`, `account-console`,
`broker`, `realm-management`, `security-admin-console`) mantêm
`offline_access` como escopo opcional: o Keycloak os recria a cada import a
partir do próprio bootstrap, e declará-los no JSON para restringir o escopo
substitui essa configuração embutida (URLs de redirecionamento, PKCE do
console, papéis) por uma quase vazia, quebrando o Account Console e o
Security Admin Console — testado ao vivo. Risco aceito para esses cinco:
nenhum carrega mapeador de audiência para `cdd-api` (nem `included.client.audience`,
nem `included.custom.audience`, em nenhum escopo que eles usam, `offline_access`
incluído) e nenhum tem `scope-mappings` para papéis de `realm-management`.
Confirmado ao vivo com um
usuário real (não o seed de import, que não recebe `default-roles-<realm>` e
por isso mascararia o teste com `not_allowed`): `account`, `account-console`
e `security-admin-console` aceitam o fluxo authorization code + PKCE com
`scope=openid offline_access` e devolvem um refresh token genuíno
(`typ: "Offline"`), com `refresh_expires_in` limitado a 28800 s pelo
`offlineSessionMaxLifespanEnabled` do realm — mas o access token que vem
junto nunca carrega `aud=cdd-api` (`aud` sai ausente ou `"account"`,
conforme o client), então a API o recusa por audiência de qualquer forma.
Nenhum dos cinco aceita password grant nem device flow (`directAccessGrantsEnabled`
e o device grant continuam desligados neles por padrão) — confirmado ao vivo
com `error=unauthorized_client` nos dois. `fumaca.sh` só prova isso para o
`admin-cli` (password grant continua funcionando, sem `aud=cdd-api`, e
`offline_access` é recusado nele); os outros quatro dependem do fluxo por
navegador e ficam fora do escopo do smoke test atual. Os clients da
aplicação (`cdd-web`, `cdd-teste`, `cdd-api-admin`) e o `admin-cli` declaram
`optionalClientScopes` explícito sem `offline_access`; os três primeiros
ficam com o escopo opcional vazio (nada além do que o app usa).

```bash
node infra/keycloak/verificar-realm.mjs             # falha se alguma regra de segurança do ARQUIVO regredir
node infra/keycloak/verificar-realm-importado.mjs   # com o compose de pé: confere o Keycloak IMPORTADO (Admin API) contra o mesmo modelo
bash infra/keycloak/fumaca.sh                       # com o compose de pé: discovery, tokens, PKCE obrigatório, recusas
```

O verificador do arquivo confere o `realm-cdd.json` versionado; o do importado confere o que o
Keycloak efetivamente carregou, pela Admin API — os dois são necessários porque o import do
Keycloak aceita nomes de campo alternativos e legados (`applicationRoles` além de `clientRoles`),
preenche padrões, resolve placeholders, e um restart com o realm já existente pula o import
inteiro (`Realm 'cdd' already exists. Import skipped`, sem CI que trave nisso). O importado
compara contra a Admin API, não só contra o arquivo, por isso fecha o que só existe em runtime:
- o **conjunto exato** de clients (`clientId`) e de usuários (por `username`, com as contas de
  serviço tratadas à parte porque o Keycloak as esconde da listagem geral de `/users`) — um
  client ou usuário a mais no realm vivo reprova, mesmo sem tocar o JSON;
- o **conteúdo** dos fluxos de autenticação em uso (`browser`, `direct grant`, `reset
  credentials`): `providerId`, `requirement` e ordem de cada execução e subfluxo, não só o nome
  do fluxo — um passo desligado (`DISABLED`) ou reordenado reprova. `authenticationFlowBindingOverrides`
  é comparado em todo client, vazio onde o modelo não declara outro;
- os **composites de `default-roles-<realm>`** (papéis de realm e de client), porque usuário
  importado (o seed do JSON) não recebe papel padrão e mascararia esse teste — qualquer papel
  novo composto ali (ex.: `realm-admin`) reprova, já que todo usuário real criado depois (inclusive
  pela conta de serviço da aplicação) herda esse conjunto automaticamente;
- os **`scope-mappings`** de cada client contra `realm-management`: só o `cdd-api-admin` pode
  enxergar `manage-users` (via `clientScopeMappings` declarado no próprio realm, não por um passo
  manual pós-import); qualquer outro client com qualquer papel de `realm-management` no escopo
  reprova;
- clientes e escopos por padrão/opcionais efetivos (`default-client-scopes`,
  `optional-client-scopes`), com `fullScopeAllowed: false` nos clients da aplicação (least
  privilege — só `admin-cli` e os clients embutidos mantêm o padrão do Keycloak);
- os mapeadores de **todo** escopo atribuído a **todo** client (aplicação, `admin-cli` e os cinco
  embutidos), comparando `protocolMapper`, `config` inteira e flags de token — não só o nome —
  para qualquer escopo usado, `offline_access` e `service_account` incluídos (um mapeador de
  e-mail enfiado em `basic` ou `roles`, ou um mapeador de audiência dentro de `offline_access`,
  reprova); mesma comparação completa para os mapeadores dedicados de cada client (inclusive o
  `cdd-api-admin`, que não deve ter nenhum, e os dois mapeadores nativos do Account Console e do
  Security Admin Console);
- os defaults do realm para clientes futuros (`default-default-client-scopes`,
  `default-optional-client-scopes`);
- os papéis efetivos (compostos, realm e por cliente) do usuário de desenvolvimento e da conta de
  serviço do `cdd-api-admin`, ausência de identity providers e de user federation;
- nos cinco clientes embutidos do Keycloak (`account`, `account-console`, `broker`,
  `realm-management`, `security-admin-console`) mais o `admin-cli`: sem conta de serviço, sem
  device flow (comparado sem diferenciar maiúsculas — `"TRUE"` conta como ligado), sem mapeador de
  audiência para `cdd-api` (nem `included.client.audience`, nem `included.custom.audience`), e
  password grant só onde o modelo espera (`admin-cli`);
- campos de segurança do realm que não têm por que mudar: `sslRequired`, `accessCodeLifespan`,
  `actionTokenGeneratedByUserLifespan`, a política de OTP inteira, os eventos e a lista completa
  de required actions (alias, `enabled` e `defaultAction`) — nenhum vira `defaultAction: true` sem
  que o teste acuse.

O segredo do `cdd-api-admin` é comparado com o valor real do ambiente, nunca com o texto do
placeholder — e esse valor, junto com `KEYCLOAK_ADMIN_SENHA` e `CDD_KC_DEV_SENHA`, é lido de
`docker compose config --format json` (o mesmo resolvedor que o `docker compose up` usa), não por
um parser de `.env` escrito à mão: um valor entre aspas no `.env` não gera mais divergência falsa.

`pnpm infra:subir` roda o verificador do arquivo antes de subir os containers (falhou, não sobe),
sobe o compose, confere a saúde, e só então roda o verificador do importado e a fumaça — qualquer
falha nessa cadeia sai com código diferente de zero. Se o Keycloak importado divergir do modelo
(por exemplo, um restart que reaproveitou um realm antigo e derivado), a mensagem de erro sugere
`pnpm infra:zerar` antes de subir de novo.

`fumaca.sh` também cria (pela conta de serviço `cdd-api-admin`) um usuário de prova, confere que
ele só herda os papéis padrão do realm (nunca algo composto a mais em `default-roles-cdd`) e apaga
o usuário — a mesma checagem do importado, mas pelo caminho real de provisionamento da aplicação.
Nenhuma senha, segredo ou token passa por argumento de `curl`/`node` (ficam visíveis a qualquer
usuário local via `ps`): segredos vão por arquivo temporário (`chmod 600`, apagado ao sair) lido
com `curl --data-urlencode campo@arquivo`, e tokens/claims são decodificados por `node` lendo do
stdin. Nem no caminho de falha o script imprime um token — quando o segredo literal do placeholder
é aceito (bug), a falha é reportada sem o `access_token`.

### Chaves de assinatura do Keycloak na API

A API valida o access token pelo JWKS do realm, com cache de 10 min. Se a busca do JWKS falhar
(Keycloak fora do ar ou reiniciando), ela continua usando as últimas chaves obtidas por até
**15 min** desde a última busca bem-sucedida. Passado esse prazo, responde
**503 `PROVEDOR_DE_IDENTIDADE_INDISPONIVEL`**, nunca 401, e por isso ninguém é deslogado por
uma queda do provedor.

**Runbook: rotação de chave por comprometimento.** Depois de rotacionar ou remover uma chave
do realm em emergência, **reinicie a API**. O cache de chaves fica em memória. Sem o reinício,
uma chave removida continua aceita até o cache expirar e, se o Keycloak estiver inacessível
para a API nesse intervalo, por até 15 min. Quem tem a chave privada emite tokens com qualquer
`exp`, então a validade de 300 s do token não limita essa janela.

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
