# TSK-513: Cadastros: Unidade, Grupo de custo e Categoria (com seed)

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Base de tudo no financeiro. Decisão do dono (14/10): a Chácara e os Dormitórios são semeados **sem receita comercial**, de forma provisória até a coordenação responder (Doc 6 §9.1 #3); trocar depois é só seed.

## O que precisa ser feito

- Agregados `Unidade` (regime; `teto_anual` na comercial, o MEI da Munay), `GrupoDeCusto` e `Categoria` (natureza, tipo, regimes permitidos, linha do relatório), com `codigo_sistema` onde o código precisa se referir a um registro.
- Migration com estrutura, RLS e só as guardas de forma (issue #11).
- Seed por instituição, idempotente, no molde do seed de grupos (#38): as unidades da casa e o plano de categorias.
- Comandos e HTTP de manutenção, com permissão; leitura para os formulários.

## Critérios de aceite

- Seed idempotente: reexecutar não duplica.
- Categoria fora dos regimes da unidade recusada pelo domínio.

## Referências

- Doc 7 §18.1; Doc 1 §10.3

_Atualizado em 14/10/2026._
