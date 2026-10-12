# TSK-601: Épica do redesign Força da Mata (Noite e Amanhecer)

- **Estado:** ✅ Concluída (épica mesclada na `main` no #196, `434544fb`, 12/10/2026)
- **Responsável:** sessão "refatorador" (execução) orquestrada pela sessão principal (revisão, gate e merge na épica); validação visual do dono
- **Depende de:** fim da refatoração estrutural do `apps/web` (#172)

## Contexto

Proposta visual entregue em 10/10/2026 como guia fora do repo e, a partir de 12/10, implementada numa branch de épica (`refactor/epica-redesign`). Cada peça entrou por PR própria, revisada e mesclada na épica; a `main` recebeu tudo de uma vez. O guia passou a viver em `docs/design/forca-da-mata/` (#187), com uma "Nota de implementação" dizendo o que foi feito diferente do proposto.

## O que foi entregue (25 PRs na épica + a PR da épica)

| Peça | PR |
|---|---|
| Remover o Tailwind (preflight para `base.css`) | #173 |
| Tokens com dois climas (`data-clima`), Alegreya, folha, texturas | #174 |
| `ClimaProvider` + Meu perfil + script inline no `index.html` | #175 |
| Átomos, moléculas, organismos do DS | #176, #177, #178 |
| Shell, Portão e Marca com a merkaba (`public/marca/`) | #179 |
| Tema de login do Keycloak (Noite fixa, fontes hospedadas OFL) | #180 |
| Gráficos com `--serie-*` e `--ramp-*` | #181 |
| Telas, módulo a módulo | #182, #183, #184, #185, #186 |
| Docs e guia no repo | #187 |
| Ajustes da validação do dono: degradê, flor discreta, vidro, cabeçalho fixo e reduzido, centralização, cipó, códigos de tela fora da UI | #188 a #195 |
| Correções do pre-review da PR da épica (loop do cabeçalho, foco, contrastes, Keycloak) | #197 |
| PR da épica para a `main` | #196 |

## Decisões do dono (12/10/2026, registradas no Doc 8 §15)

- Validação visual só no fim da épica; sem captura de telas e sem teste novo (4333 → 4331 testes; só saíram os dois do código de tela).
- Clima escolhido em Meu perfil e guardado em `localStorage` (`cdd.clima`); sem backend; sem troca automática; padrão Noite; login do Keycloak fixo na Noite.
- Nomes dos tokens do DS mantidos; só o valor muda por clima.
- Códigos de tela (F-03, T-02…) saem da interface; continuam nos docs.
- Desfoque só em superfícies e seleção (cartão, cabeçalho, rail, item selecionado), nunca em grades e etiquetas: dezenas de camadas derrubavam o frame rate (Agenda 48 → 11, Parâmetros 41 → 10).
- Guia versionado em `docs/design/forca-da-mata/`.

## Referências

- `docs/design/forca-da-mata/GUIA-FORCA-DA-MATA.md` (nota de implementação), `docs/CDD-08-frontend-estrutura.md` §10.5 e §15
- Follow-ups: [TSK-602](TSK-602-backlog-tecnico-do-redesign.md) (técnico) e [TSK-603](TSK-603-fases-futuras-da-mata.md) (produto)

_Atualizado em 12/10/2026._
