# TSK-301: Persistência da identidade e seed dos grupos por instituição

- **PR:** [#38](https://github.com/AurioNeto/ceudodespertar/pull/38)
- **Estado:** ✅ Feito (#38, 08/10/2026)
- **Peça do plano:** I04
- **Responsável sugerido:** limpio + testudo (crivo)
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md), [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Os agregados `Grupo` e `Usuario` (#25 e #26) ainda não têm repositório. O catálogo das 64 permissões já é migration (b0-003). O seed dos seis grupos é por instituição.

## Como terminou

Mesclado pelo [#38](https://github.com/AurioNeto/ceudodespertar/pull/38) (`40d0765`):
- **Agregado `Usuario`:** ganhou `convite.criado_por`, `ativado_em`, `suspenso_em` e `atribuicoesPendentes`, e o domínio garante a validade de 72 h do convite.
- **Repositórios MikroORM de `Usuario` e `Grupo`:** trava otimista com `versao` no `WHERE` e o outbox na mesma transação. Uma escrita concorrente recebe 409.
- **Seed:** idempotente em `(instituicao_id, codigo_sistema)`, sem reverter edição feita depois (G5), falhando alto em colisão de nome e serializado por advisory lock por instituição.
- **Testes:** isolamento entre instituições (FK composta e RLS), concorrência com barreira, T29(e) com a matriz do Doc 3 §6 conferida linha a linha.
- **Decisão do dono:** reativar zera `suspenso_em`, que passa a significar a suspensão em vigor.

## O que resta

- Registrar as entidades no ORM e os repositórios e o seed num módulo, e decidir onde o `semear` roda na criação de instituição (TSK-313).
- `salvar` não atualiza a versão do objeto em memória. Duas gravações da mesma instância no mesmo comando conflitam (atenção no TSK-304).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/25
- https://github.com/AurioNeto/ceudodespertar/pull/26

_Atualizado em 08/10/2026._
