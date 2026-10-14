# TSK-511: Contrato do financeiro e da pessoa mínima

- **Estado:** 🔍 Em revisão (B1)
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

## Como ficou

- **Tipos** em `packages/contracts/src/financeiro.ts`:
  - `Unidade`, `GrupoDeCusto`, `Categoria`, `Conta`, `Fundo`, `Lancamento`, `Transferencia` e `PeriodoContabil`, no formato do esquema do Doc 7 (`versao` em todos);
  - em `pessoas.ts`, a `Pessoa` mínima (nome, tipo e documento).
- **`Lancamento`:**
  - `status` gravado é só `A_CONFERIR` ou `CONFIRMADO`; o estornado é derivado (`estornadoPorId`);
  - `confirmadoPor` é `{ autorTipo: 'USUARIO', autorId }` ou `{ autorTipo: 'SISTEMA', autorId: null }`, com a origem dizendo de onde veio (decisão do dono, 14/10).
- **Comandos Zod** em `comandos/financeiro.ts` e `comandos/pessoas.ts`:
  - cadastros (criar e editar);
  - lançamento (registrar, editar, confirmar com etiquetas, estornar);
  - pendência (abrir e responder);
  - transferência (registrar e estornar);
  - período (parâmetros e reabertura com 10+ caracteres);
  - pessoa (cadastrar, editar e filtro).
- **Validação:**
  - `dinheiroPositivo`, `dataLocalValida` e `competenciaValida` em `entrada.ts`;
  - a soma das etiquetas fica para o agregado (`ETIQUETAS_NAO_FECHAM`), não para o Zod.
- **Erros:** 26 códigos novos, com status em `STATUS_POR_CODIGO` e a invariante de cada um no Doc 7 §12. O T29 e o catálogo continuam verdes.
- **Front:**
  - os formatos de tela de `Conta` e `Fundo` viraram os read models `ContaComSaldo` e `FundoComSaldo`, e o web os importa com alias, sem migrar telas (isso é da TSK-520);
  - a `Pessoa` completa antiga virou `FichaDaPessoa`, ainda sem consumidor.

## Para as peças seguintes (apontado no crivo)

- **TSK-515:**
  - o `confirmado_por` do esquema do Doc 7 é só `uuid`, e o `l7_confirmado_completo` o exige não nulo. Para o autor `SISTEMA` (decisão do dono), a migration precisa de uma coluna de tipo do autor, como em `shared.registro_de_auditoria`, ajustando o `CHECK`;
  - `EditarLancamento` e `EditarTransferencia` substituem o registro inteiro (semântica de `PUT`): campo omitido vira nulo. A tela envia o formulário completo.
- **TSK-516:** o contrato aceita as sete finalidades, mas fatura, empréstimo e adiantamento só existem na B2. Na B1, a referência dessas finalidades não existe, e o domínio responde `RECURSO_NAO_ENCONTRADO`. Se for preciso distinguir, um código próprio entra na TSK-516.
- **TSK-514:** o FD1 (saída do fundo para categoria fora da lista) usa `CATEGORIA_FORA_DO_FUNDO`.
- **Dinheiro:** cada valor vai até 10¹⁴ centavos, para a soma de 20 etiquetas continuar exata em `number`.

## Critérios de aceite

- Contrato publicado e consumido pela API e pelo web sem erro de tipo.
- T29 verde; nenhum código de erro sem status.

## Referências

- Doc 7 §18 e §12; Doc 6 §5 (o que muda em `packages/contracts`)
- Doc 2 v2.2 (`project/uploads/CDD - System/`), invariantes L1–L11

_Atualizado em 14/10/2026._
