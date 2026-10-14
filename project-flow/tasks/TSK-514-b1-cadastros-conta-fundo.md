# TSK-514: Cadastros: Conta e Fundo

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-513](TSK-513-b1-cadastros-unidade-categoria.md)

## Contexto

Conta é onde o dinheiro está (saldo lê lançamentos e transferências); fundo é conta vinculada com meta e categorias permitidas (FD1).

## O que precisa ser feito

- Agregados `Conta` (tipo, titularidade, titular quando pessoal, identificador bancário único para casar o OFX na B3) e `Fundo` (conta vinculada, meta, categorias permitidas por código), com teste de domínio.
- Migration, repositório, comandos, HTTP e leitura, no molde da TSK-513.

## Critérios de aceite

- Identificador bancário duplicado recusado.
- Fundo com categoria fora da lista recusado (FD1).

## Referências

- Doc 7 §18.1 e §18.4

_Atualizado em 14/10/2026._
