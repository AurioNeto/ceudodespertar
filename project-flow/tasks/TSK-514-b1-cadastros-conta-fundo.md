# TSK-514: Cadastros: Conta e Fundo

- **Estado:** 🚧 Parte A mesclada na `main` (#235, 30/10/2026); parte B implementada localmente, aguardando revisão e merge
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
- **Parte B (implementada localmente em 30/10/2026; sem merge):**
  - criação e edição de conta conferem a unidade na casa; unidade nova precisa estar ativa;
  - na criação do fundo e na troca da conta vinculada, a conta precisa existir e estar ativa na casa; vínculos mantidos continuam editáveis após inativação;
  - comandos, HTTP com `financeiro.conta.ler` e `financeiro.conta.gerenciar` (e `financeiro.fundo.gerenciar` no fundo) e leitura do cadastro sem saldo;
  - os comandos conferem que a conta vinculada e os códigos das categorias permitidas existem na casa;
  - listas devolvem `{ itens }` com os cadastros e suas versões, incluindo inativos, sem saldo;
  - edição exige `If-Match`; criação devolve `201` com `Location` e usa a idempotência da infraestrutura.
- **Pendências por ordem das peças:**
  - a existência e a situação ativa da pessoa titular na casa são conferidas pela porta pública de Pessoas na branch da TSK-512; `pessoa_titular_id` continua sem FK entre schemas;
  - CT2 (despesa em conta pessoal exige adiantamento) e CT3 (conta com saldo não se inativa) dependem de lançamento e saldo (TSK-515 e TSK-519);
  - FD2 (saldo do fundo nunca negativo) e FD3 (aporte é transferência) ficam para a TSK-516 e a TSK-519.
  - O saldo de verdade e os read models `ContaComSaldo` e `FundoComSaldo` são da TSK-519.

## Endpoints da parte B

| Método | Rota (prefixo `/api/v1`) | Permissão |
|---|---|---|
| GET | `/financeiro/contas` | `financeiro.conta.ler` |
| POST | `/financeiro/contas` | `financeiro.conta.gerenciar` |
| PUT | `/financeiro/contas/:id` | `financeiro.conta.gerenciar` |
| GET | `/financeiro/fundos` | `financeiro.conta.ler` |
| POST | `/financeiro/fundos` | `financeiro.fundo.gerenciar` |
| PUT | `/financeiro/fundos/:id` | `financeiro.fundo.gerenciar` |

## Validação local da parte B (30/10/2026)

- 15 testes HTTP novos: contratos e permissões, referências inexistentes/inativas ou de outra instituição, identificador duplicado, código de fundo duplicado, imutabilidade dos campos fixos, `If-Match`, rollback, replay idempotente e edição concorrente.
- Suíte da API: 2.161 testes passando e 30 casos futuros (`todo`).
- Integração completa da API: 663 testes passando, incluindo os 15 novos.
- Typecheck da API, lint de API/contracts, fronteiras do backend e build de contracts/API passaram.
- Os comandos de verificação foram executados pelos binários locais (`node`, `tsc`, `vitest`, `oxlint` e `depcruise`): o launcher do pnpm não conseguiu obter/verificar a versão fixada no ambiente. Os testes HTTP e de integração exigiram acesso a portas locais e ao Docker.

## Critérios de aceite

- Identificador bancário duplicado recusado.
- Fundo com categoria fora da lista recusado (FD1).

## Referências

- Doc 7 §18.1 e §18.4

_Atualizado em 30/10/2026._
