# TSK-518: Comprovante (anexo no S3) e Evento mínimo

- **Estado:** 🚧 Partes A e B implementadas em branches empilhadas, aguardando revisão
- **Responsável sugerido:** back (limpio + continuum no S3)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Duas dependências laterais da B1: o comprovante do lançamento (o `shared.anexo` foi adiado do B0 para cá) e o Evento mínimo (decisão 6 da TSK-014), que o resultado por cerimônia precisa.

## O que precisa ser feito

Dois PRs:
1. **Anexo:** `shared.anexo` e a porta de armazenamento (SeaweedFS local, compatível com S3), com upload por URL assinada ou pelo servidor (decidir no desenho), tipo e tamanho validados, e o vínculo com o lançamento.
2. **Evento mínimo:** tabela e resumo do evento, sem comandos de inscrição (isso é B5), só o necessário para o lançamento apontar para um evento (a transferência não tem `evento_id`) e para o resultado por cerimônia (TSK-519) ler o resumo do evento.

## Critérios de aceite

- Anexo de outra instituição inacessível.
- Lançamento ligado a evento aparece no resultado por cerimônia (TSK-519).

## Referências

- Doc 7 §10 e §19; Doc 6 §6

_Atualizado em 05/11/2026._


## Parte A — comprovantes

Branch `codex/tsk-518-a-comprovantes`, sobre `codex/tsk-517-periodos-contabeis`.

- `PUT /api/v1/financeiro/lancamentos/:id/comprovante` recebe um campo multipart `arquivo`, exige `If-Match` e segue a autorização de edição do lançamento. Aceita PDF, JPEG e PNG de até 10 MiB, com checagem da assinatura inicial. O upload é feito pelo servidor e grava SHA-256 e metadados em `shared.anexo`.
- `GET /api/v1/financeiro/lancamentos/:id/comprovante` exige acesso ao lançamento e entrega metadados e uma URL assinada de 5 minutos. A URL deve ser tratada como credencial temporária. A chave do objeto usa instituição, módulo e UUID gerado na API.
- Um upload substitui o vínculo na versão seguinte do lançamento pendente. A edição comum preserva o comprovante, e o estorno tem comprovante próprio. Falha no S3 desfaz as alterações do PostgreSQL. Objetos substituídos ou gravados antes de uma falha de commit podem ficar órfãos. A coleta de órfãos fica pendente.
- Testes HTTP cobrem isolamento, tipos, tamanho, versão, persistência, confirmação e rollback. Um SeaweedFS 3.97 descartável confirmou PUT autenticado, GET assinado e GET anônimo recusado.


## Parte B — evento mínimo

Branch `codex/tsk-518-b-evento-minimo`, sobre `codex/tsk-518-a-comprovantes`.

- `POST /api/v1/financeiro/eventos` exige `eventos.evento.criar` e recebe `unidadeId`, `nome`, `tipo`, `dataInicio` e `dataFim`. A unidade precisa estar ativa na instituição autenticada. Retorna 201, resumo e `Location`.
- `GET /api/v1/financeiro/eventos/:id` devolve o resumo a quem pode criar eventos, registrar, ler ou conferir lançamentos, ou ler resultados por cerimônia. Referências de outra instituição recebem 404.
- A API financeira valida `eventoId` no registro, na edição e na conferência pela porta pública `EventosMinimos`. O relatório da TSK-519 poderá resolver o resumo pela mesma porta. Inscrições e operação completa do evento são da B5.
- As duas migrations acrescentam tabelas com RLS forçada e permissões de leitura e inserção. A reversão remove os novos cadastros. As referências entre módulos são verificadas pela aplicação.

## Validação e revisão

- 2.328 testes da API, 798 de integração e 67 de contratos passaram. Os sete testes direcionados passaram com 93,93% de branches nos novos casos de uso e na persistência de eventos medidos.
- Build, typecheck de API e web, lint e fronteiras de arquitetura passaram.
- A revisão Crivo confirmou que a autorização do lançamento precede a assinatura da URL, que um comprovante não pode ser transplantado pelo id e que o S3 não recebe escrita quando a versão está vencida. No cadastro de eventos, RLS e a verificação da unidade mantêm as referências no contexto da instituição.
