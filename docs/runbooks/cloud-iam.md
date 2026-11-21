# Keycloak na Cloud-IAM

Ambiente gratuito de homologação criado em 20/11/2026, Keycloak 26.8.2. O plano
compartilhado limita o ambiente a um realm e 100 usuários, sem tema personalizado.
A Cloud-IAM não recomenda o Freemium para produção:
https://documentation.cloud-iam.com/faq/plan.html.

## Endereços

- Console: `https://lemur-2.cloud-iam.com/auth/admin/ceu-do-despertar/console/`.
- Emissor: `https://lemur-2.cloud-iam.com/auth/realms/ceu-do-despertar`.
- Base de administração: `https://lemur-2.cloud-iam.com/auth` (preservar `/auth`).
- Frontend: `https://ceudodespertar-web.vercel.app`.

A descoberta pública OIDC respondeu e confirmou emissor e endpoints. A conexão
administrativa da Oracle foi validada; o login completo do frontend ainda está pendente.

## Clientes

Os arquivos em `infra/keycloak/cloud-iam/` descrevem os clientes deste ambiente.
Não importar `realm-cdd.json` inteiro: ele contém usuário de desenvolvimento,
SMTP local e referências ao tema `cdd`, indisponível no plano gratuito.

- `cdd-web.json`: público, código com PKCE S256, sem senha de cliente, sem grants
  diretos; audiência `cdd-api` no access token. Retornos e origem restritos à Vercel.
- `cdd-api-admin.json`: confidencial, somente conta de serviço. O segredo é gerado
  pelo Keycloak, nunca incluído no JSON. Atribuir à conta de serviço somente
  `realm-management/manage-users` e permitir esse mesmo papel no scope do cliente,
  mantendo `Full scope allowed` desligado, como no realm local.

No Keycloak 26.8.2, adicionar também o client scope `kc-admin-api` como **Default**
no `cdd-api-admin`. Ele acrescenta a audiência exigida pela API administrativa;
`manage-users` sozinho não evita HTTP 401 nessa versão. Não adicionar esse escopo
ao cliente público `cdd-web`. Referência:
https://documentation.cloud-iam.com/references/keycloak-upgrades.html.

Validação em 20/11/2026, após corrigir os papéis e atribuir `kc-admin-api`:
segredo aceito, emissor correto e somente `manage-users` entre os papéis administrativos
do token. A consulta `users/count` respondeu 200 e a consulta de clientes respondeu
403, tanto localmente quanto a partir da Oracle. A audiência administrativa exigida
passou a constar no token. Não foram criados usuários ou enviados convites nesses testes.

Não atribuir `realm-admin`, gerenciamento de clientes ou outros papéis administrativos.
Não importar usuários ou senhas de demonstração. A configuração destes clientes e
dos papéis deve ser reconferida após qualquer alteração no ambiente.

## Configuração da aplicação

API, em `/etc/cdd/api.env` na Oracle:

```dotenv
OIDC_EMISSOR=https://lemur-2.cloud-iam.com/auth/realms/ceu-do-despertar
OIDC_AUDIENCIA=cdd-api
OIDC_CLIENTES_AUTORIZADOS=cdd-web
KEYCLOAK_URL_BASE=https://lemur-2.cloud-iam.com/auth
KEYCLOAK_REALM=ceu-do-despertar
KEYCLOAK_ADMIN_CLIENT_ID=cdd-api-admin
KEYCLOAK_CLIENT_ID_DO_CONVITE=cdd-web
APP_URL_BASE=https://ceudodespertar-web.vercel.app
ORIGENS_CORS=https://ceudodespertar-web.vercel.app
```

Adicionar `CDD_KC_ADMIN_SEGREDO` separadamente a partir da credencial gerada no
Keycloak; arquivo protegido com permissão `600`. Não usar a senha do administrador.
Guardar cópia protegida do ambiente anterior para reversão antes de reiniciar
`cdd-api`; validar prontidão e rejeição de acesso sem token após a mudança.

Vercel, variáveis públicas de build do frontend:

```dotenv
VITE_OIDC_EMISSOR=https://lemur-2.cloud-iam.com/auth/realms/ceu-do-despertar
VITE_OIDC_CLIENTE=cdd-web
```

Refazer o deploy do frontend após atualizar essas variáveis. O segredo administrativo
não pertence à Vercel nem às variáveis `VITE_*`.

## Verificações da API em 20/11/2026

Configuração aplicada em `/etc/cdd/api.env`, proprietário root e permissão `600`,
com cópia anterior protegida em `/etc/cdd/api.env.antes-cloud-iam-20261120232842`.
O serviço `cdd-api` foi reiniciado e permanece ativo, escutando somente em
`127.0.0.1:3000`. Viva e prontidão responderam 200. `/api/v1/eu` rejeitou acesso
anônimo e o token da conta administrativa com 401, preservando a restrição ao
cliente web e à audiência de negócio. CORS confirmou apenas a origem da Vercel.
A credencial do migrador permanece ausente do ambiente. O script temporário foi removido.

O endpoint público de autorização de `cdd-web` exibiu login (200) com retorno correto
e PKCE S256. Rejeitou retorno em outro domínio (400) e falta de PKCE por redirect
com `error=invalid_request` e `Missing parameter: code_challenge_method`. Isso não
substitui login real nem comprova os claims de um token de usuário.

## Pendências e limites

- A API já responde em `https://ceudodespertar-api.duckdns.org`, com certificado
  público validado. Falta atualizar `VITE_API_URL` e as variáveis OIDC na Vercel,
  refazer o deploy e testar login real. Ver `oracle-api-https.md`.
- Vercel e Cloud-IAM estão em sites diferentes. A recuperação silenciosa de sessão
  pode falhar com bloqueio de cookies de terceiros, especialmente após F5 em Safari
  e Firefox. Ver `mesmo-site-spa-keycloak.md`; não considerar essa combinação
  equivalente ao requisito de produção sem validar e resolver essa limitação.
- Configurar SMTP real para convites e recuperação de senha; não copiar Mailpit.
- Conferir políticas de senha, proteção contra tentativas, duração de sessão e
  idioma a partir do realm local, preservando o acesso administrativo do provedor.
- Validar código + PKCE, audiência e emissor do token, logout e negação de token
  emitido por outro cliente. Validar permissões efetivas da conta de serviço.
- Cadastro inicial concluído pelo CLI em modo vínculo: instituição criada e primeiro
  administrador ativo. O responsável já definiu a senha; falta confirmar o login real.
  Ver `primeiro-administrador.md`. O administrador do console Keycloak continua
  separado do administrador da aplicação.

Até concluir essas verificações, o ambiente de identidade não está integrado de ponta a ponta.
