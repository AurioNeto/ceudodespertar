# Frontend na Vercel

O projeto `ceudodespertar-web` usa **Root Directory: `apps/web`**. A Vercel lê
`apps/web/vercel.json`; não colocar a configuração somente na raiz do monorepo.

A aplicação usa React Router no navegador. A regra `rewrites` serve `index.html`
para caminhos sem arquivo correspondente, incluindo `/entrar`, `/entrar/retorno`
e as páginas internas. O endereço e a query do retorno OIDC são preservados.
Arquivos existentes, como `/silencioso.html` e `/assets/*`, têm precedência e
continuam sendo servidos diretamente. Não redirecionar o retorno para `/`: a
aplicação precisa processar `state` e o código de autorização na rota original.

Referências oficiais:
- https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas
- https://vercel.com/docs/project-configuration/vercel-json#rewrites

## Publicação e verificação

Publicar um commit que contenha `apps/web/vercel.json`. Reexecutar um deploy antigo
sem essa configuração mantém o erro. Conferir as variáveis públicas do ambiente:

```dotenv
VITE_API_URL=https://ceudodespertar-api.duckdns.org
VITE_OIDC_EMISSOR=https://lemur-2.cloud-iam.com/auth/realms/ceu-do-despertar
VITE_OIDC_CLIENTE=cdd-web
```

Nenhum segredo administrativo pertence ao frontend.

`VITE_API_URL` é a origem da API, sem `/api/v1`: o cliente HTTP acrescenta esse
prefixo. Sem a variável, usa `/api/v1` na origem do frontend para preservar o
proxy local. Na Vercel, configurar a origem HTTPS da Oracle e refazer o build;
sem ela, a regra SPA devolve HTML para chamadas de API feitas ao próprio frontend.

No Keycloak 26.8, o mapper Audience não inclui clientes inexistentes. Como a API
de negócio valida o identificador `cdd-api` sem um cliente homônimo no realm
hospedado, configurar o mapper `audiencia-cdd-api` do `cdd-web-dedicated` com
**Included Custom Audience: `cdd-api`**, **Included Client Audience vazio** e
**Add to access token ligado**. O access token deve conter `aud: cdd-api`;
o ID token continua destinado a `cdd-web`. Não remover a validação de audiência
na API. Referência: https://www.keycloak.org/admin-api/protocol-mappers.

Depois do deploy:

1. Abrir `/entrar` e `/entrar/retorno` diretamente: ambos devem servir o frontend
   com status 200. Sem um fluxo OIDC em andamento, a rota de retorno pode mostrar
   erro da própria aplicação; isso é diferente de `404 NOT_FOUND` da Vercel.
2. Confirmar `/silencioso.html` com seu conteúdo próprio e `/assets/*` com JavaScript
   ou CSS, sem substituição indevida pelo HTML principal.
3. Iniciar um novo login em `https://ceudodespertar-web.vercel.app/` e confirmar
   retorno ao painel, acesso à API e logout. Não reutilizar links antigos que
   contenham `code` e `state`, nem registrar esses parâmetros no repositório.

## Diagnóstico em 20/11/2026

A versão pública respondeu 200 para `/` e `/silencioso.html`, mas 404 para
`/entrar` e `/entrar/retorno`. Não havia configuração Vercel no repositório.
O build do frontend passou e gerou ambas as entradas HTML. A correção local
adiciona a regra SPA recomendada pela Vercel. Publicação e login real após essa
correção ainda precisam ser validados.
