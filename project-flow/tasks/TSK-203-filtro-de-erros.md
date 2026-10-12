# TSK-203: Filtro global de erros, If-Match e validação Zod (#22)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `a9b4d1d`)
- **Peça do plano:** F14
- **PR:** [#22](https://github.com/AurioNeto/ceudodespertar/pull/22)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-201](TSK-201-unidade-de-trabalho-e-borda.md)

## Contexto

Corpo de erro `{erro, detalhes?, correlacaoId}` e mapa exaustivo de status.

## O que foi entregue

- Filtro global que traduz `P0001`, constraint nomeada, `OptimisticLockError` (409) e falta de `If-Match` (428).
- Status por código: 401 para situação, 403 para `USUARIO_DESCONHECIDO` na resolução, 409 para `GRUPO_*`/`CONVITE_JA_PENDENTE`, 413 e 428.
- Helper de correlação `correlacao-da-requisicao.ts`.
- Pipe Zod (`StandardSchemaValidationPipe`).

## Como terminou

- **Decisões do usuário:** `CHAVE_DE_IDEMPOTENCIA_REUTILIZADA` = **422** e `USUARIO_DESCONHECIDO` = **401**. O status de cada código vem do catálogo (`STATUS_POR_CODIGO`), registrado no Doc 7 §12.
- `a0a4647`, `ea851c3`, `a8ca9f3`, `05b44e4`:
  - uma `HttpException` com código do catálogo no corpo responde por esse código;
  - os erros 4xx do body-parser viram `CORPO_INVALIDO`;
  - o mapa por status ganhou testes.
- Na sincronização com a `main` (`eae1de3`), a `/saude/pronta` passou a responder 503 por `@Res({ passthrough: true })`, fora do contrato de erros. Entrou também o teste do `correlacaoId` no corpo igual ao cabeçalho.
- No #24, a classificação de erros do banco saiu do filtro para `banco/classificacao-de-erros-do-banco.ts`, por causa da regra `orm-so-na-infraestrutura-de-banco`.
- Sem correção: `CORPO_INVALIDO` devolve frases do Zod em inglês (TSK-411).

## O que resta

- TSK-411.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/22
- https://github.com/AurioNeto/ceudodespertar/pull/22#discussion_r4187822646
- https://github.com/AurioNeto/ceudodespertar/pull/22#discussion_r4187819275

_Atualizado em 07/10/2026._
