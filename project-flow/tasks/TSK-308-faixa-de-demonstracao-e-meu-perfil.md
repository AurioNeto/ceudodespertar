# TSK-308: Faixa "dados de demonstração" e Meu perfil real

- **Estado:** ✅ Concluída
- **Peça do plano:** W03
- **Responsável sugerido:** vitro + frontiteto
- **Depende de:** [TSK-302](TSK-302-contextualizar-e-get-eu.md)

## Contexto

As telas ainda usam mocks. O usuário precisa saber o que é real e o que é demonstração.

## O que precisa ser feito

- Registro de fonte por tela (`mock` ou `api`) e faixa visível em toda tela mock.
- Meu perfil lendo o `/eu`: grupos e permissões.
- Tirar dado de saúde do Painel, da Agenda e de Pessoas, e ajustar o texto de "link sem login" (correções pendentes da etapa F).

## Critérios de aceite

- Faixa em toda tela mock
- O perfil lista as permissões do `/eu`

## Decisões do dono (08/10/2026)

- **Registro de fonte:** `app/telas.ts`, um `Record<RotaId, { fonte: 'mock' | 'api' }>`. A TSK-309 acrescenta a permissão no mesmo registro.
- **Granularidade:** binária por tela. Tela mista conta como mock.
- **Faixa:**
  - Componente de apresentação no DS. O Layout renderiza a faixa entre o AppShell e o `Outlet`, conforme o registro.
  - `/i/:token` também mostra a faixa.
  - Tom royal, fixa, sem botão de fechar, `role="note"`.
  - Texto: "Dados de demonstração. Esta tela ainda não está ligada ao sistema: o que aparece aqui é exemplo e nada é gravado."
- **Sessão de demonstração** (`VITE_SESSAO_DE_DEMONSTRACAO=1`): faixa em todas as telas.
- **Meu perfil:** só dado real do `/eu`, ou seja, nome, e-mail, instituição, grupos e permissões, mais o encerrar sessão.
  - As permissões aparecem com a descrição do `CATALOGO_DE_PERMISSOES` do contracts, agrupadas por módulo, com o código. Um código fora do catálogo aparece cru.
  - Saem os dados pessoais, os aparelhos, os avisos e a aba anamnese, que voltam na B4.
- **Dado de saúde:** o Painel, a Agenda, Pessoas, Leitos e a descrição do grupo Guardião **mantêm** os pontos de atenção, porque são importantes para o atendimento. Isso inverte a decisão 8 do Doc 6 para estas telas.
  - A visibilidade fica como hoje.
  - A restrição por `pessoas.anamnese.ler`, com registro de acesso, fica pendente para quando a anamnese for real (B4).
  - Só o mock da Auditoria perde o "gestante" nos detalhes, porque a trilha não guarda dado pessoal (#41).
- **Link do preparo:** o texto passa a ser "Link do preparo copiado. Quem abrir entra com o próprio login para marcar as tarefas." O webhook e o link da Anamnese ficam como estão.
- **Gates:** `pnpm --filter @cdd/web test`, typecheck, lint e fronteiras. O lint e as fronteiras da raiz não cobrem o web. Ampliar isso é da TSK-407.

## Como terminou

O PR #42 entrou na main em 08/10/2026 (`43deecc`).
- `app/telas.ts` registra a fonte de cada tela. Só o Meu perfil é `api`.
- A faixa "dados de demonstração" aparece em toda tela mock, em `/i/:token` e, com a sessão de demonstração, em todas as telas.
- O Meu perfil lê o `/eu`: nome, e-mail, instituição, grupos e as permissões com a descrição do catálogo, agrupadas por módulo.
- O mock da Auditoria saiu sem dado de saúde, e o aviso do link do preparo agora diz que quem abre entra com o próprio login.
- `iniciais()` ignora palavras que não começam com letra.

## O que resta

- A restrição dos pontos de atenção de saúde por `pessoas.anamnese.ler`, com registro de acesso, fica para a B4.
- A descrição de uma permissão em `packages/contracts/src/identidade/permissoes.ts:14` cita um ID de plano. Falta corrigir.
- O `pnpm lint` e o `pnpm fronteiras` da raiz não cobrem o `apps/web` (TSK-407).
- Em `telas.ts`, as telas mock dividem o mesmo objeto `MOCK`. Quando a TSK-309 acrescentar a permissão, cada uma precisa de objeto próprio.
- Na `/i/:token` a faixa não é fixa: ela sai da tela com a rolagem.

_Atualizado em 08/10/2026._
