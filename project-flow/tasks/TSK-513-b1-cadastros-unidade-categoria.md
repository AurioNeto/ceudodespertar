# TSK-513: Cadastros: Unidade, Grupo de custo e Categoria (com seed)

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Base de tudo no financeiro. Decisão do dono (14/10): a Chácara e os Dormitórios são semeados **sem receita comercial**, de forma provisória até a coordenação responder (Doc 6 §9.1 #3); trocar depois é só seed.

## Decisões do dono (15/10/2026)

- **Unidades semeadas:**
  - CDD: contribuição;
  - Munay: comercial, teto MEI de R$ 81 mil;
  - Lojinha: comercial;
  - Chácara e Dormitórios: contribuição, provisório desde 14/10;
  - Pessoal: contribuição, unidade técnica.
- **Plano de categorias semeado:** as 14 categorias ativas do protótipo do front, com natureza, tipo, regimes e linha do relatório. As três legadas da planilha (Investimento na Lojinha, Movimentação, Empréstimo antigo) ficam para a migração (TSK-507), que as cria se precisar delas.
- **Grupos de custo da planilha também são semeados:** CDD, Lojinha, Dormitório, Chácara, Cozinha e Secretaria. Ajustar depois é editar ou inativar pela tela.

## O que precisa ser feito

- Agregados `Unidade` (regime; `teto_anual` na comercial, o MEI da Munay), `GrupoDeCusto` e `Categoria` (natureza, tipo, regimes permitidos, linha do relatório), com `codigo_sistema` onde o código precisa se referir a um registro.
- Migration com estrutura, RLS e só as guardas de forma (issue #11).
- Seed por instituição, idempotente, no molde do seed de grupos (#38): as unidades da casa e o plano de categorias.
- Comandos e HTTP de manutenção, com permissão; leitura para os formulários.
- Nit do #228: `ParametrosDoCadastro` passa a usar `uuidEmMinusculas`.

## Como ficou

- **Parte A (este PR):** módulo `financeiro`, migration `b1-001-cadastros-do-financeiro` (schema, três tabelas, RLS forçada, únicas nomeadas), os agregados com teste por invariante (U1, teto só na comercial, C1, C2, C3 com `CATEGORIA_FORA_DO_REGIME`), os repositórios Kysely com trava otimista e o seed.
  - O seed é idempotente por `codigo_sistema` e roda onde a instituição nasce, pelo ponto de extensão `SemeadoresDaInstituicao` em `shared/infrastructure/semeadura`: a identidade não pode importar o financeiro. Ele não sobrescreve o que a tesouraria editou ou inativou.
  - Um registro **apagado** à mão volta na próxima execução, como nos grupos de sistema: a tesouraria inativa, não apaga.
  - Junto veio o nit do #228: `ParametrosDoCadastro` com `uuidEmMinusculas`.
- **Parte B (PR empilhado sobre o da parte A):** comandos, HTTP e leitura em `/api/v1/financeiro`.
  - Rotas: `GET`, `POST` e `PUT /:id` de `unidades`, `grupos-de-custo` e `categorias`. A leitura exige `financeiro.plano_contas.ler`; o resto, `financeiro.plano_contas.gerenciar`.
  - A edição é `PUT` com `If-Match` obrigatório. O `POST` aceita `Idempotency-Key`.
  - A unidade padrão da categoria precisa existir na casa (senão `RECURSO_NAO_ENCONTRADO`), estar ativa (senão `CADASTRO_INATIVO`, decisão do dono de 15/10) e ter regime permitido (senão `CATEGORIA_FORA_DO_REGIME`), ao criar e ao editar. Inativar uma unidade que já é padrão de alguma categoria continua permitido.
  - Não há `GET` por id: o formulário usa as listas, que trazem a versão.
  - A recusa da unidade inativa vale quando a categoria passa a apontá-la. Uma categoria que já apontava uma unidade depois inativada continua editável, inclusive para se inativar (achado do crivo, coerente com a decisão de 15/10).
  - `PUT` é substituição: campo opcional omitido vira nulo (por exemplo, o `tetoAnual`). A tela envia o formulário completo.
  - A conferência de versão é uma cópia da identidade (`financeiro/application/conferir-versao.ts`), porque o financeiro não importa a identidade. Se aparecer um terceiro módulo, ela vai para `shared/kernel`.
- **Ficou para depois, porque depende de lançamento:** U3 (mudar o regime com lançamento no período aberto, `REGIME_COM_LANCAMENTO_NO_PERIODO`) e C4 (categoria com lançamento confirmado só se inativa), na TSK-515.
- **Sem outbox nem trilha nos cadastros:** os agregados não emitem evento, e a trilha não tem operação de cadastro. Incluir uma alteraria o `CHECK` de `identidade.registro_de_auditoria`. Se o dono quiser trilha dos cadastros, é peça à parte.
- **Tipo da categoria imutável**, como no Doc 2 §1.2 (`readonly tipo`): sai do `EditarCategoria`, no contrato, e da alteração do agregado (achado do crivo).
- **Instituição criada antes desta migration** não recebe os cadastros pelo bootstrap, que roda uma vez só. O seed de demonstração os completa ao ser reexecutado; para uma casa real, hoje só existem bancos locais. Se for preciso antes do primeiro deploy, entra um comando de semeadura no CLI.
- **Erros de forma:** os do agregado (C1, teto, regimes repetidos) saem como `CORPO_INVALIDO`, com o nome da regra do Zod em `detalhes`.

## Critérios de aceite

- Seed idempotente: reexecutar não duplica.
- Categoria fora dos regimes da unidade recusada pelo domínio.

## Referências

- Doc 7 §18.1; Doc 1 §10.3

_Atualizado em 15/10/2026._
