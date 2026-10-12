# TSK-602: Backlog técnico do redesign (pre-review da PR da épica e verificações pendentes)

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** vitro (+ frontiteto no item 1)
- **Depende de:** [TSK-601](TSK-601-epica-redesign-forca-da-mata.md)

## Contexto

O pre-review da PR da épica (#196) deixou cinco minors de desenho que o dono decidiu não bloquear o merge, e a revisão deixou verificações que só um aparelho real responde. O blocker e os majors foram corrigidos no #197.

## O que fica

1. **Regra de vidro por atributo explícito.** Hoje `base.css` aplica o desfoque leve por seletor `[style*="background: var(--token);"]` (cinco tokens). Cria contexto de empilhamento e containing block em 9 a 15 elementos por tela, inclusive `<input>` e `<select>`, e depende da serialização literal do estilo inline. Trocar por constante de estilo (`vidroLeve` em `ds/fundacao/estilos.ts`) ou atributo `data-vidro`, e um teste estrutural que acuse `position: fixed` sem portal dentro de superfície de vidro. ([#196, achado](https://github.com/AurioNeto/ceudodespertar/pull/196#discussion_r4251889885))
2. **Script do clima gerado no build.** `index.html` repete chave, valor e cor de `ds/providers/ClimaProvider/constantes.ts`. Gerar por `transformIndexHtml` do Vite, ou teste de estrutura que compare os dois. ([achado](https://github.com/AurioNeto/ceudodespertar/pull/196#discussion_r4251890027))
3. **Caminho da merkaba.** `/marca/merkaba.png` depende de `base: '/'`; usar `import.meta.env.BASE_URL` ou importar o asset. ([achado](https://github.com/AurioNeto/ceudodespertar/pull/196#discussion_r4251890530))
4. **Clima entre abas.** O provider não escuta o evento `storage`; duas abas ficam com climas diferentes até recarregar. Decidir se sincroniza. ([pergunta](https://github.com/AurioNeto/ceudodespertar/pull/196#discussion_r4251890459))
5. **Degradê fixo no iOS.** `background-attachment: fixed` no `body`; conferir no iPhone (app, Portão e inscrição pública) e, se piscar, trocar por pseudo-elemento fixo. ([achado](https://github.com/AurioNeto/ceudodespertar/pull/196#discussion_r4251890252))
6. **Verificações em aparelho real:** rolagem de Lançamentos num Android de campo (desfoque de 16px por `RecordRow`); impressão na Noite (texto claro sem o fundo escuro); custo aceito do cabeçalho: clique com mouse num botão do cabeçalho o segura completo até o próximo clique fora.
7. **Tema de e-mail do Keycloak** ainda cita Archivo e caixa alta inline (`themes/cdd/email/**`); ficou fora da épica. Junto com os três pontos da [TSK-416](TSK-416-tema-keycloak-ressalvas.md).
8. **Telas de erro e de senha do Keycloak**: só login inválido e redefinição com e-mail vazio foram conferidas no navegador (#197); `login-update-password` e `info`/`error` não.

## Critérios de aceite

- Itens 1 a 3 sem mudança visual; gate verde; nenhum `position: fixed` sem portal dentro de vidro.
- Itens 5, 6 e 8 fechados por verificação do dono, com registro no Doc 8 §14 ou §15.

## Referências

- PR #196 (resumo do pre-review no comentário inicial), PR #197
- `docs/CDD-08-frontend-estrutura.md` §10.5

_Atualizado em 12/10/2026._
