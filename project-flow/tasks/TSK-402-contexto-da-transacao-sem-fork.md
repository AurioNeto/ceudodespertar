# TSK-402: Estreitar `ContextoDaTransacao` (sem `fork`/`transactional`)

- **Estado:** ✅ Feito (pelo teste estrutural do T28a, #66, 10/10/2026)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

`contexto.em.fork()` dentro de um consumidor cria um EM sem a transação corrente. O flush dele commita fora do savepoint, e a reentrega duplica o efeito. A regra de fronteira não pega isso, porque não há import.

## O que precisa ser feito

- Expor um tipo que omita `fork`, `transactional` e `begin`, ou uma regra ou teste estrutural que proíba `.fork(` fora de `shared/infrastructure/banco`.

## Critérios de aceite

- O compilador ou o teste impedem o uso

## Como terminou

O bloqueio veio pelo teste, não pelo tipo. O detector do T28a (`apps/api/test/estrutural/escrita/`) recusa `fork`, `transactional`, `begin`, `commit`, `rollback`, `transaction` e `startTransaction` fora de `shared/infrastructure/banco/`. Um consumidor plantado com `contexto.em.fork()` fora dessa pasta faz o teste falhar.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24

_Atualizado em 12/10/2026._
