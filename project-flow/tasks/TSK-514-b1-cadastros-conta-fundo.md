# TSK-514: Cadastros: Conta e Fundo

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-513](TSK-513-b1-cadastros-unidade-categoria.md)

## Contexto

Conta é onde o dinheiro está (saldo lê lançamentos e transferências); fundo é conta vinculada com meta e categorias permitidas (FD1).

## O que precisa ser feito

- Agregados `Conta` (tipo, titularidade, titular quando pessoal, identificador bancário único para casar o OFX na B3) e `Fundo` (conta vinculada, meta, categorias permitidas por código), com teste de domínio.
- Migration, repositório, comandos, HTTP e leitura, no molde da TSK-513.

## Decisões do dono (30/10/2026)

- **Forma canônica do identificador bancário (CT4):** sem espaços (inclusive os internos e invisíveis) e em maiúsculas; barras e hífens ficam. "341 /1" e "341/1" são o mesmo identificador, e "itau-1" vira "ITAU-1". Na B3, com o OFX real em mãos, dá para apertar mais.
- **A conta vinculada do fundo pode mudar**, como diz a nota de modelagem do Doc 2 §1.9. Trocar a conta não move dinheiro: o saldo do fundo vem dos lançamentos e das transferências (TSK-519), e mover o saldo antigo é uma transferência.

## Decisões do dono (22/11/2026)

- **Conta pela tela:** `identificadorBancario` e `unidadeId` continuam opcionais e nascem nulos quando a tela não os envia (o contrato já era assim). O tipo só se escolhe na criação, e a tela passa a cumprir isso.
- **Responsável da conta:** texto livre na B1 (`responsavel` nos comandos de conta, vazio por padrão). O vínculo com pessoa fica para a B4. Esta peça precisa da coluna `financeiro.conta.responsavel` numa migration nova, bloqueada até a conciliação do banco hospedado.
- **CT1:** o responsável é só um rótulo. Conta `PESSOAL_DE_TERCEIRO` continua exigindo `pessoaTitularId`, e na B1 não se cria pela tela; a CT1 e o `CHECK` ficam intactos. Decisão do orquestrador, a confirmar pelo dono.
- **Fundo pela tela:** sem `codigoSistema`, o backend gera o código; sem `contaVinculadaId`, vale a conta vinculada padrão; `categoriasPermitidas` e `meta` são opcionais na B1. Na edição, a conta vinculada continua obrigatória.
- **Valor reservado:** `valorReservado` (opcional, nunca negativo) nos comandos de fundo. A diferença vira transferência interna na conta vinculada: aumentar é `APORTE_A_FUNDO`, diminuir é `RESGATE_DE_FUNDO` (finalidade nova). Nas duas, a origem é igual ao destino e o dinheiro não sai da conta. O saldo do fundo continua derivado (FD3).
- **Edição com versão:** `ContaComSaldo` e `FundoComSaldo` trazem `versao`, que a tela devolve no `If-Match`. A API sempre devolve a versão; no tipo ela é opcional porque o rascunho de registro novo não a tem (decisão do orquestrador).

## Como ficou

- **Parte A (este PR):** migration `b1-002-conta-e-fundo`, os agregados `Conta` e `Fundo` com teste por invariante e os repositórios Kysely com trava otimista.
  - **Conta:**
    - CT1: titularidade pessoal se, e só se, houver titular;
    - tipo, titularidade e titular imutáveis;
    - identificador bancário na forma canônica (sem espaços, maiúsculas), e vazio vira nulo;
    - CT4: duplicado na mesma casa dá `IDENTIFICADOR_BANCARIO_JA_CADASTRADO` (critério de aceite); em outra casa é aceito, e dois nulos não colidem.
  - **Fundo:**
    - código imutável; conta vinculada editável (decisão do dono);
    - guarda uma cópia da lista de categorias;
    - meta positiva;
    - categorias sem repetição;
    - FD1: `conferirSaidaParaCategoria` recusa categoria fora da lista com `CATEGORIA_FORA_DO_FUNDO` (critério de aceite). Fundo com lista vazia recusa toda saída. A TSK-515 usa esse método no lançamento.
- **Parte B (próximo PR):**
  - na edição do fundo, a conta vinculada nova precisa existir e estar ativa na casa;
  - comandos, HTTP com `financeiro.conta.ler` e `financeiro.conta.gerenciar` (e `financeiro.fundo.gerenciar` no fundo) e leitura do cadastro sem saldo;
  - conferir, no comando, que a conta vinculada e as categorias permitidas existem na casa.
- **Pendências por ordem das peças:**
  - a existência da pessoa titular na casa entra com a TSK-512 (o schema `pessoas` ainda não existe, e `pessoa_titular_id` é só um uuid);
  - CT2 (despesa em conta pessoal exige adiantamento) e CT3 (conta com saldo não se inativa) dependem de lançamento e saldo (TSK-515 e TSK-519);
  - FD2 (saldo do fundo nunca negativo) e FD3 (aporte é transferência) ficam para a TSK-516 e a TSK-519.
  - O saldo de verdade e os read models `ContaComSaldo` e `FundoComSaldo` são da TSK-519.

## Critérios de aceite

- Identificador bancário duplicado recusado.
- Fundo com categoria fora da lista recusado (FD1).

## Referências

- Doc 7 §18.1 e §18.4

_Atualizado em 30/10/2026._
