# TSK-305: Adaptador do Keycloak: convite por e-mail, ativação e suspensão

- **Estado:** 🚧 API concluída (PRs 1 a 6 e 8 mesclados em #51, #52, #65, #74, #76, #79 e #80); PR 7 (front) entregue em duas partes, a rota /entrar (#200) e o reenvio do convite com o 429 em Acessos; falta o aceite real no Keycloak local
- **Peça do plano:** I10
- **Responsável sugerido:** escudo + limpio (crivo)
- **Depende de:** [TSK-304](TSK-304-gestao-de-usuarios-e-grupos.md), [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

O convite e a definição de senha usam o Keycloak, com o tema do #29. A conta de serviço `cdd-api-admin` tem só `manage-users`.

## O que precisa ser feito

- Criar o usuário no Keycloak e disparar o `execute-actions-email` (UPDATE_PASSWORD, 72 h) com `redirect_uri` para uma **rota de entrada do SPA**, e não `/callback`.
- `POST /eu/ativacao` com `@ApenasIdentificado`. O handler checa a situação por conta própria (T26).
- Reenviar convite; ao suspender, desabilitar e fazer logout no Keycloak.
- Reações pelo outbox (`@ReageA`).
- `POST /eu/ativacao` roda sem instituição no contexto. Resolver antes o conflito com o `Idempotency-Key` automático do front (TSK-407).

## Decisões do dono (09/10/2026)

1. **Envio do convite:** continua no `aoConfirmar`, como decidido na TSK-304. Suspender e reativar reagem pelo outbox (`@ReageA`). O token nunca fica gravado em claro.
2. **Prova de quem ativa:**
   - o token do convite;
   - a conferência de que o e-mail do `sub` no Keycloak é o mesmo do convite;
   - a trava de edição de e-mail e username no realm.
3. **Idempotência da ativação:** `POST /eu/ativacao` fica isenta pela marca `@SemIdempotencia`. A idempotência vem do domínio.
4. **Limite do reenvio:** mínimo de 60 s desde o convite vigente. O excesso responde 429 com `Retry-After`.
5. **Usuário que já existe no Keycloak (409):** adotar o usuário existente. A regra é um e-mail para uma casa só. Se o e-mail pertence a outra casa, o convite falha em silêncio, com log, sem revelar a outra instituição.
6. **Onde roda o aceite:**
   - no CI, o adaptador é testado contra um servidor HTTP falso;
   - o aceite real roda em `pnpm test:keycloak`, local;
   - a TSK-311 incorpora esse aceite depois.
7. **Suspensão no Keycloak:** o consumidor aplica o estado atual do banco, e a reativação também libera no `aoConfirmar`. O alerta de evento esgotado fica para observabilidade.
8. **Transação da ativação:** `POST /eu/ativacao` usa `@SemTransacaoNaBorda`. O verificador de modo de transação só aceita essa exceção em rota mutante que também tenha `@SemIdempotencia`. O caso de uso abre a própria transação depois de resolver a instituição pelo convite.
9. **Sujeito já vinculado (09/10):** o convite é bloqueado se a conta do Keycloak já pertence a outro usuário, de outra casa ou da mesma.
10. **Convite pendente em outra casa (09/10):** a adoção do mesmo usuário do Keycloak é aceita; a barreira fica na ativação (`SUJEITO_JA_VINCULADO`).
11. **Nome no Keycloak (09/10):** o realm mantém o sobrenome obrigatório; ninguém tem nome de uma palavra só.
12. **Variáveis novas (09/10):** cinco variáveis obrigatórias do Keycloak e do convite; o `.env` local e o de deploy precisam delas antes de subir a API.
13. **Reenvio (10/10):** `Retry-After` só em 429; a espera vai no cabeçalho e em `detalhes.retryAfterSegundos`.
14. **Ativação (10/10):** a violação de `usuario_subject_id_key` vira `SUJEITO_JA_VINCULADO` no repositório, sem migração; o contrato usa `{ convite }`; não exige `emailVerified` agora (confirmar no aceite real se o link de senha já marca o e-mail como verificado). Sem limite de tentativas na ativação por enquanto.
15. **Suspensão no Keycloak (10/10):** a liberação direta da reativação relê a situação no banco antes de reabilitar a conta; evento sem instituição continua lançando erro; reativar usuário já ativo continua liberando.
16. **Pendências obrigatórias (10/10):** alerta de evento esgotado no outbox antes de produção (observabilidade); o aceite real confere que reabilitar a conta no Keycloak 26 não apaga nome, sobrenome nem atributos.
17. **Reenvio na tela Acessos (12/10):** o painel do usuário com convite pendente ganha o botão "Reenviar convite", que antes não existia no front; o 429 mostra quanto falta esperar.

**Divisão em PRs:**
1. `@SemIdempotencia`.
2. b0-010 `resolver_convite`.
3. Cliente e provedor do Keycloak, mais a trava do realm.
4. 429, `Retry-After` e limite do reenvio.
5. `POST /eu/ativacao`.
6. Consumidores de suspensão e reativação.
7. Front: `/entrar`.
8. Aceite real.

O desenho está no scratchpad da sessão (`tsk305-desenho.md`).

## Critérios de aceite

- Contra o Keycloak real: e-mail no Mailpit
- A ativação leva o usuário a ATIVO
- Depois de desativar, o refresh falha (T26)

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/29

_Atualizado em 12/10/2026 (front entregue em duas partes)._
