# Runbook — Rotação de chave de assinatura do Keycloak

Quando usar: a chave privada de assinatura do realm `cdd` foi (ou pode ter sido) comprometida e
foi rotacionada ou removida no Keycloak. A decisão de origem está no README, seção "Chaves de
assinatura do Keycloak na API" (#27).

## Como a API usa as chaves

A API valida o access token pelo JWKS do realm (`<OIDC_EMISSOR>/protocol/openid-connect/certs`).
Valores reais em `apps/api/src/shared/infrastructure/autenticacao/chaves-remotas.ts`:

| Parâmetro | Valor | Efeito |
|---|---|---|
| `cacheMaxAge` (`validadeDoCacheEmMs`) | 600 000 ms (10 min) | Enquanto o JWKS em cache tem menos de 10 min, a API não volta ao Keycloak para buscar de novo |
| `cooldownDuration` | 30 000 ms (30 s) | Um token com `kid` desconhecido só força nova busca se a última tiver mais de 30 s |
| Stale-if-error (`idadeMaximaDoJwksVelhoEmMs`) | 900 000 ms (15 min) | Se a busca falha, a API segue com as últimas chaves obtidas por até 15 min desde a última busca bem-sucedida |
| Pausa após falha (`esperaAposFalhaEmMs`) | 30 000 ms | Depois de uma falha de busca, a API usa direto as chaves velhas por 30 s, sem tentar o Keycloak |

O cache fica **em memória, por processo**. Não existe comando nem rota para esvaziá-lo.

## Risco

A chave **removida continua aceita** até o cache expirar, ou seja, por até 10 min desde a última
busca. Se o Keycloak estiver inacessível para a API nesse intervalo, ela continua aceita por até
15 min. Quem tem a chave privada emite tokens com qualquer `exp`, então a validade de 300 s do
access token não limita essa janela (README, seção citada acima).

## Ação

1. Rotacione ou remova a chave comprometida no realm `cdd` do Keycloak.
2. **Reinicie a API.** O reinício descarta o cache em memória, e a primeira requisição autenticada
   busca o JWKS atual. Se houver mais de um processo da API, reinicie todos. Não há orquestrador
   nem serviço da API no `compose.yaml`: encerre e suba de novo o processo do mesmo jeito que ele
   foi iniciado (localmente, `pnpm --filter @cdd/api dev` ou `pnpm --filter @cdd/api start`,
   definidos em `apps/api/package.json`).

## Verificação

1. Confira que o JWKS publicado não traz mais o `kid` removido:
   ```bash
   curl -s "$OIDC_EMISSOR/protocol/openid-connect/certs"
   ```
2. Confira que a API reiniciou depois da remoção (horário de partida no log do processo).
3. Se você tiver um access token assinado pela chave removida, uma requisição com ele no
   `Authorization: Bearer` tem de receber **401**, com o aviso `Token recusado: …` no log da API
   (`guarda-de-acesso.ts:85`). Use o access token, nunca o refresh token.

## Sintomas que podem aparecer

| Sintoma | Causa | O que fazer |
|---|---|---|
| 401 em tokens recém-emitidos, logo depois da rotação, com `Token recusado` no log | Token com `kid` novo chegou menos de 30 s depois da última busca do JWKS (cooldown); o erro de chave não encontrada não é tratado como falha de busca | Passa sozinho após o cooldown; o front renova num 401 |
| 503 `PROVEDOR_DE_IDENTIDADE_INDISPONIVEL`, com `Provedor de identidade indisponível: …` no log (`guarda-de-acesso.ts:82`) | A busca do JWKS falhou e não há chaves utilizáveis: nenhuma busca bem-sucedida nos últimos 15 min ou, durante a falha, o `kid` do token não está nas chaves velhas. Logo depois de um reinício com o Keycloak fora, não há chave nenhuma em cache | Restabeleça o acesso da API ao Keycloak. O 503 não desloga ninguém |
