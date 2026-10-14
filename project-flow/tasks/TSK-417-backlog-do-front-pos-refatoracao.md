# TSK-417: Backlog do front depois da refatoração

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** vitro
- **Depende de:** fim da refatoração do apps/web (Limpeza)

## O que fica

1. ✅ **Remover o Tailwind.** Entregue no #173 e na `main` desde o #196 (épica do redesign, 12/10/2026). O reset dos elementos que as telas usam foi para o fim do `ds/fundacao/tokens/base.css`, e o plugin, o `@theme` e as dependências saíram. Sem captura de telas; a validação visual é do dono (Doc 8 §15, "O que fazer com o Tailwind?").
2. **Desvios estruturais pequenos** (anexo do Doc 8, §14 "Pendências do mapeamento"):
   - componentes acima de 200 linhas: resta o `CartaoDeContratacao` (230). `Participacao` e `BlocoDePergunta` ficaram abaixo de 200 no #167;
   - ✅ `BlocoDePergunta` e `DetalheDoTrabalho` recebem `campo: boolean` em vez de `densidade` (em revisão, 14/10);
   - ✅ estado fora de `hooks/`: `Cadastro` de Leitos, `Herdadas` e `AbaDeUsuarios` (em revisão, 13/10);
   - ✅ `EntrarPage` e `RetornoPage` chamam um hook só (em revisão, 13/10).
   - A conferência de 12/10 na `main` achou mais casos do mesmo tipo, que não estavam no anexo:
     - acima de 200 linhas no `ds`: `PendencyCard` (219) e `PainelDeAcao` (207);
     - ✅ `campo: boolean`: `Cartao`, `Portao`, `PainelDeRevisao`, `GraficoSerie` e `PainelDeQuebra` (em revisão, 14/10: os três primeiros no #222, com `Cartao` e `Portao` em `density`, como o resto do `ds`; `GraficoSerie` e `PainelDeQuebra` no #221);
     - `useState` fora de `hooks/`: `DescarteDoRascunho` e `PainelDeConvite` em revisão (13/10). ✅ `PainelDoUsuario`, `GraficoSerie`, `PainelDeFiltros` e `PainelDeQuebra`, que tinham ficado para depois por colidirem com o #202 e o #206, em revisão no #221 (14/10).
3. **Consolidar os apoios de teste repetidos** entre telas (`usarDensidade`, `textosDasFolhas`, `campoRotulado` e outros).
4. **Divergências de comportamento abertas** no Doc 8, seções 14.3 e 14.4: bugs e ajustes de tela sem decisão, inclusive as quebras de linha em campo que o R$ causou. As que dependem do dono estão na [TSK-018](TSK-018-decidir-perguntas-do-front.md).

## Referências

- `docs/CDD-08-frontend-estrutura.md` (seções 13.7, 14 e 15) e `docs/CDD-08-anexo-mapa-de-migracao.md`

Nota (12/10/2026): a épica do redesign (TSK-601) vestiu os componentes e as telas sem mexer na estrutura, então os itens 2 a 4 continuam como estão; os desvios de `campo: boolean` em `Cartao` e `Portao` seguem.

_Atualizado em 14/10/2026._
