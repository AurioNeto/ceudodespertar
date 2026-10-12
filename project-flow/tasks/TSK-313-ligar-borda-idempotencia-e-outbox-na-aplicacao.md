# TSK-313: Ligar borda, idempotência, outbox e adaptador de instituição na aplicação

- **PR:** [#40](https://github.com/AurioNeto/ceudodespertar/pull/40)
- **Estado:** ✅ Feito (#40, 08/10/2026)
- **Responsável sugerido:** limpio + crivo
- **Depende de:** [TSK-302](TSK-302-contextualizar-e-get-eu.md)

## Contexto

Os módulos da fundação estão na `main`, mas **nenhum está registrado no `AppModule`**. O `AppModule` só importa configuração, log, banco, saúde, filtro de erros e autenticação. Na aplicação real, então, não rodam:
- a borda transacional (`BordaTransacionalModule`);
- a idempotência e o expurgo das chaves (`IdempotenciaModule`);
- o despachante e a vigia de esgotados (`EventosModule`).

O `ProvedorDeContextoDeInstituicao` de produção continua o vazio, que é fail-closed. A ordem "borda antes da idempotência" só existe nos módulos de teste. E há dois conceitos com o mesmo nome: a classe `ContextoDaRequisicao` (ALS) e a função `contextoDaRequisicao()` da guarda.

## Como terminou

Mesclado pelo [#40](https://github.com/AurioNeto/ceudodespertar/pull/40) (`1a1c238`):
- **Composição:** guarda, depois borda, depois idempotência, com `EventosModule`, `IdempotenciaModule` e `BordaTransacionalModule` na aplicação.
- **`ProvedorDeContextoDeInstituicaoDoAcesso`:** lê o contexto da guarda. Sem contexto, a escrita é barrada (fail-closed).
- **Rename:** a função da guarda virou `contextoDeAcessoDaRequisicao`.
- **Identidade:** os repositórios e o `SemeadorDeGruposDeSistema` entraram no `IdentidadeModule`.
- **Verificador:** a partida é recusada se uma rota que muda estado não declara modo gravável ou usa `@SemTransacaoNaBorda`.
- **Saúde:** as rotas de saúde levam `@SemTransacaoNaBorda`.
- **401:** todo 401 leva `WWW-Authenticate`.
- **Despachante:** loga só na mudança de estado.
- **Testes com a aplicação real:** idempotência com instituição, a suspensão invalidando pelo evento e os jobs agendados. A API real subiu contra o ambiente local.

**Decisões do dono:**
- (a) rota que muda estado declara modo gravável;
- (b) `@SemTransacaoNaBorda` na saúde;
- (c) `WWW-Authenticate` em todo 401 pelo filtro.

## O que resta

- O semeador não tem chamador ainda. O bootstrap (TSK-306) vai chamá-lo.
- `ProvedorDeContextoDeInstituicaoVazio` ficou sem uso em produção.
- Uma rota `@Publico` que precise de banco (link público) vai ter de resolver a instituição.
- `DESPACHANTE_ATIVO` e `DESPACHANTE_INTERVALO_MS` no `.env` não têm efeito.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/19#issuecomment-6001397293
- https://github.com/AurioNeto/ceudodespertar/pull/35#discussion_r4200573727

_Atualizado em 08/10/2026._
