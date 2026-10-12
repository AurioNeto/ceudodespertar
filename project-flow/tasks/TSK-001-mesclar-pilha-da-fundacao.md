# TSK-001: Mesclar a pilha da fundação (#19 e filhos)

- **Estado:** ✅ Feito (06/10/2026)
- **Responsável sugerido:** usuário

## Contexto

Seis PRs da fundação estão abertos, cinco deles empilhados sobre o #19 (unidade de trabalho e borda transacional). Todos têm CI verde e pre-review. Nada do backend que falta no B0 começa sem eles na `main`.

## Como terminou

- #19 e #20 entraram juntos na `main` (`cec80ca`).
- **O #21 foi mesclado por engano na branch do #19** (`90d6788`), porque a base dele não foi trocada depois do merge do pai (`delete_branch_on_merge=false`). O conteúdo chegou à `main` pelo **#34** (`675dbbe`), um PR de resgate com o mesmo código.
- Os demais entraram nesta ordem: #22 (`a9b4d1d`), #23 (`dbbb706`), #24 (`10b66d7`). Antes de cada merge, a branch recebeu a `main` e rodou a suíte inteira.
- A sincronização revelou conflitos de comportamento, que não aparecem como conflito de texto:
  - o filtro do #22 transformava o 503 da `/saude/pronta` em 500;
  - a regra `orm-so-na-infraestrutura-de-banco` do #24 quebrava com o código do #22 e do #23. Foi resolvido seguindo a regra, sem exceções.
- `lista.ts` ficou com b0-000 a b0-005 em ordem, e a CI da `main` ficou verde.

## Lição

Com `delete_branch_on_merge=false`, sempre rode `gh pr edit N --base main` nos filhos **antes** de mesclá-los. E rode a suíte inteira depois de cada sincronização com a `main`.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/19
- https://github.com/AurioNeto/ceudodespertar/pull/20
- https://github.com/AurioNeto/ceudodespertar/pull/21
- https://github.com/AurioNeto/ceudodespertar/pull/22
- https://github.com/AurioNeto/ceudodespertar/pull/23
- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/34
- https://github.com/AurioNeto/ceudodespertar/pull/34

_Atualizado em 07/10/2026._
