# TSK-414: Domínio de identidade: G3 e nits de grupos

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** limpio

## Contexto

Achados do #25 e do #26 que não foram corrigidos. O write skew da política do último administrador foi para o TSK-304.

## O que precisa ser feito

- ➡️ A validade de 72 h do convite e as colunas `convite.criado_por`, `usuario.ativado_em` e `suspenso_em` foram para o TSK-301, porque precisam estar prontas antes da persistência.
- O G3 é decidido com uma contagem de fora, sem nada que serialize contra a entrada de usuário no grupo.
- `Grupo.criar` não emite evento, então criar um grupo não deixa trilha, contra o Doc 3 §10.4 ("toda operação de escrita registra").
- `protegido` e `codigoSistema` são independentes no domínio, e o manifesto não traz `protegido`.
- "ADMINISTRADOR inclui código novo" só vale para instituição semeada depois.

## Critérios de aceite

- G3 serializado contra a entrada de usuário no grupo, ou o risco aceito com registro

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187820854
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187821053

_Atualizado em 08/10/2026._
