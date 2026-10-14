# TSK-414: Domínio de identidade: G3 e nits de grupos

- **Estado:** ✅ Feito (#214): G3 com risco aceito e registrado, criação de grupo com trilha, grupo de sistema sempre protegido; "ADMINISTRADOR inclui código novo" virou follow-up
- **Responsável sugerido:** limpio

## Contexto

Achados do #25 e do #26 que não foram corrigidos. O write skew da política do último administrador foi para o TSK-304.

## O que precisa ser feito

- ➡️ A validade de 72 h do convite e as colunas `convite.criado_por`, `usuario.ativado_em` e `suspenso_em` foram para o TSK-301, porque precisam estar prontas antes da persistência.
- ✅ O G3 é decidido com uma contagem de fora, sem nada que serialize contra a entrada de usuário no grupo. **Risco aceito com registro (decisão do dono, 13/10/2026):** hoje não existe caso de uso nem rota de exclusão de grupo, só o método `Grupo.excluir` usado em testes, então a corrida não acontece em produção. **Obrigação do futuro caso de uso de exclusão:** tomar a trava advisory por instituição que a política do último administrador usa desde o #45 e contar os usuários ativos do grupo depois dela. Hoje essa trava só é tomada por definir grupos do usuário, desativar usuário e revogar permissão do grupo; para fechar o G3, **todos os caminhos que tornam um usuário ativo num grupo** também têm que tomá-la — ativar convite e reativar usuário, além de definir grupos. Teste de concorrência com barreira explícita (nada de sleep) para exclusão × cada um desses caminhos.
- ✅ `Grupo.criar` não emite evento, então criar um grupo não deixa trilha, contra o Doc 3 §10.4 ("toda operação de escrita registra"). O #49 não tinha resolvido. Agora `Grupo.criar(dados, autorId, em)` emite `GRUPO_EDITADO` com `acao: 'CRIADO'` (nome, descrição, permissões, autor, código de sistema), a trilha síncrona do repositório a grava e o mapeamento da auditoria a mostra. Hoje não existe rota nem caso de uso de criação de grupo: a garantia vale no agregado e no repositório, para quando a rota existir. Os grupos de sistema do semeador continuam sem trilha: são semeados por SQL na criação da instituição, não por `Grupo.criar`.
- ✅ `protegido` e `codigoSistema` são independentes no domínio, e o manifesto não traz `protegido`. **Decisão do dono (13/10/2026):** grupo de sistema é sempre protegido (Doc 3, G2); grupo da casa pode ou não ser. O agregado recusa o contrário ao criar e ao reconstituir (`ErroDeGrupoDeSistemaDesprotegido`, erro de programação, sem CHECK no banco). O manifesto continua sem `protegido`, porque a proteção decorre do código.
- ➡️ "ADMINISTRADOR inclui código novo" só vale para instituição semeada depois. **Avaliação:** o ADMINISTRADOR do manifesto usa `PERMISSOES` inteiro, mas o semeador só insere permissões de grupo que ele mesmo acabou de criar; uma permissão nova no catálogo (migration) não chega ao ADMINISTRADOR das instituições existentes. **Follow-up (exige migração de dados, fora deste PR):** cada migration que acrescentar permissão ao catálogo também concede a permissão ao grupo `ADMINISTRADOR` de toda instituição existente (ou um passo de sincronização idempotente do manifesto), com teste. Hoje, com uma instituição só na máquina do dono, nenhuma permissão nova foi acrescentada depois do seed.

## Critérios de aceite

- G3 serializado contra a entrada de usuário no grupo, ou o risco aceito com registro

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187820854
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187821053

_Atualizado em 14/10/2026._
