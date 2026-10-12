# TSK-006: Versionar os Documentos 1–5 v2.2 em `docs/`

- **Estado:** 🔧 Processo (ação manual)
- **Responsável sugerido:** glossia

## Contexto

Os Documentos 1–5 ficam em `project/uploads/CDD - System/`. Estão no git desde o primeiro commit, mas com nome e lugar instáveis: o caminho tem espaço, o Doc 1 só existe na v2.1 e o Doc 4 aparece em duas versões (v2.1 com sufixo `(1)` e v2.2). O Doc 3 é editado no próprio lugar (notas do B0 no #96). Em `docs/` estão os Docs 6, 7 e 8, este com o anexo.

## O que precisa ser feito

- Copiar os Documentos 1–5 vigentes para `docs/` com nomes estáveis (`CDD-0N-…md`), decidindo qual versão do Doc 4 vale.
- Ajustar as referências por caminho: `.codefox.yaml`, o Doc 8 (três ocorrências) e `apps/api/test/autorizacao/leitor-de-testes.ts`, que lê o Doc 3 para o meta-teste da suíte de autorização. O Doc 7 e o plano citam os documentos só pelo nome.
- Decidir o destino de `project/uploads/` (arquivo histórico ou remoção).

## Critérios de aceite

- Os Documentos 1–8 em `docs/`
- Nenhuma referência a `project/uploads/` nos documentos vigentes nem no teste da suíte de autorização

## Referências

- project/uploads/CDD - System/

_Atualizado em 12/10/2026._
