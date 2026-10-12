# TSK-004: Limpar worktrees e branches temporárias depois dos merges

- **Estado:** ✅ Feito (07/10/2026)
- **Responsável sugerido:** orquestrador
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md), [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Há 8 worktrees em `.claude/worktrees/` (F15, F16, I02, I03, I05, I09, W01, W02) e branches locais como `f15-correcao-b0` e `feat/b0-f16-idempotencia-fix`. A worktree da F16 tem um `.env` local.

## Como terminou

- Todas as worktrees foram removidas: as de `.claude/worktrees/` e as criadas pelos workflows fora do repositório. Antes, conferi que cada uma estava contida na `main` e sem mudança pendente. O `.env` local de uma delas era só de teste.
- As branches locais foram apagadas. As duas antigas de 28/09 (`ci/b0-f06-qualidade-fix` e `test/b0-f10-garantias`) só foram apagadas depois de comparar o conteúdo com a `main`: eram versões de antes do rebase.
- As 26 branches remotas dos PRs mesclados foram apagadas, cada uma depois de confirmar que a ponta estava na `main`. Isso inclui a `feat/b0-f12-unidade-de-trabalho`, com o merge errado do #21: os dois pais dele já estavam na `main`.
- Hoje só existe a `main`, local e remota.

## Para as próximas ondas

Repita a limpeza depois de cada merge. Continua valendo: o repositório não apaga a branch ao mesclar.

_Atualizado em 07/10/2026._
