# TSK-511: Contrato do financeiro e da pessoa mínima

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio)
- **Depende de:** nada

## Contexto

Primeira peça da B1 (molde P1). O front e a API passam a falar a mesma língua antes de qualquer tabela. O contrato atual do front tem `categoriaIds[]`, `tipo` com `TRANSFERENCIA` e `grupo` em texto, e o Doc 7 §18.2 lista o que muda.

## O que precisa ser feito

- Tipos e esquemas Zod em `packages/contracts` para: `Unidade` (com regime), `GrupoDeCusto`, `Categoria` (natureza, regimes permitidos, linha do relatório), `Conta`, `Fundo`, `Lancamento`, `Transferencia`, `PeriodoContabil` e `Pessoa` mínima (nome, tipo, documento).
- `Lancamento` conforme o Doc 7 §18.2:
  - `etiquetas: { categoriaId, natureza, valor }[]`;
  - só `natureza` (transferência é outro agregado);
  - `grupoDeCustoId`;
  - `pessoaId` ou `contraparteTexto`;
  - `OrigemLancamento` com os 8 valores;
  - `confirmadoPor`, `confirmadoEm` e `versao`.
- Dinheiro sempre inteiro em centavos.
- Códigos de erro novos no catálogo, com status em `STATUS_POR_CODIGO`: `ETIQUETAS_NAO_FECHAM`, `CATEGORIA_OBRIGATORIA`, `PERIODO_FECHADO` e os que o desenho pedir. O T29 (catálogo contra o contrato) continua verde.
- O front pode seguir no mock, mas os tipos do mock passam a vir do contrato onde já coincidem. Não migrar telas nesta peça.

## Critérios de aceite

- Contrato publicado e consumido pela API e pelo web sem erro de tipo.
- T29 verde; nenhum código de erro sem status.

## Referências

- Doc 7 §18 e §12; Doc 6 §5 (o que muda em `packages/contracts`)
- Doc 2 v2.2 (`project/uploads/CDD - System/`), invariantes L1–L11

_Atualizado em 14/10/2026._
