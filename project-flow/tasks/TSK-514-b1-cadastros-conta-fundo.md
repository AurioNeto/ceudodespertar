# TSK-514: Cadastros: Conta e Fundo

- **Estado:** 🚧 Parte A mesclada na `main` (#235, 30/10/2026); parte B pendente
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-513](TSK-513-b1-cadastros-unidade-categoria.md)

## Contexto

Conta é onde o dinheiro está (saldo lê lançamentos e transferências); fundo é uma reserva com destinação vinculada, associada a uma conta, com meta opcional e categorias permitidas (FD1).

## O que precisa ser feito

- Agregados `Conta` (tipo, titularidade, titular quando pessoal, identificador bancário único para casar o OFX na B3) e `Fundo` (conta vinculada, meta, categorias permitidas por código), com teste de domínio.
- Migration, repositório, comandos, HTTP e leitura, no molde da TSK-513.

## Decisões do dono (30/10/2026)

- **Forma canônica do identificador bancário (CT4):** sem espaços (inclusive os internos e invisíveis) e em maiúsculas; barras e hífens ficam. "341 /1" e "341/1" são o mesmo identificador, e "itau-1" vira "ITAU-1". Na B3, com o OFX real em mãos, dá para apertar mais.
- **A conta vinculada do fundo pode mudar**, como diz a nota de modelagem do Doc 2 §1.9. Trocar a conta não move dinheiro: o saldo do fundo vem dos lançamentos e das transferências (TSK-519), e mover o saldo antigo é uma transferência.

## Como ficou

- **Parte A (entregue no #235):** migration `b1-002-conta-e-fundo`, os agregados `Conta` e `Fundo` com teste por invariante e os repositórios Kysely com trava otimista.
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
- **Parte B (pendente):**
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
