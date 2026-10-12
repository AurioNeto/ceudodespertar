# TSK-007: Resíduos conhecidos: ID de plano no compose e piso do verificador

- **Estado:** 🔧 Processo (ação manual)
- **Responsável sugerido:** continuum
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

Dois resíduos ficaram registrados na memória:
- a linha 1 do `compose.yaml` cita "plano B0/F02", contra a convenção de IDs;
- o `verificar-referencia.sh` da infra local usa piso de 113 casos (vale por `>=`) e devia ter subido quando o esquema de referência ganhou casos. Pela contagem estática, a referência tem hoje 155 casos. O número subiu em 26/09, e o script foi editado em 27/09 sem subir o piso.

A conferência de 12/10 achou mais ocorrências:
- `docs/sql/cdd-07-verificacao.sql`, linhas 98, 163 e 889 (F07 e F08). A issue #11 congela esse SQL, salvo o cabeçalho, então mexer nelas é decisão do dono;
- o nome de teste em `apps/api/test/unidade-de-trabalho/kysely-tipado.integracao.test.ts` traz `(F13)`;
- `infra/postgres/papeis.sql` cita "plano B0".

## O que precisa ser feito

- Reescrever o comentário do `compose.yaml` sem ID de plano.
- Atualizar o piso do verificador da referência para o número atual de casos, ou removê-lo se a referência for só documentação congelada (issue #11).
- Tirar o `(F13)` do nome do teste em `kysely-tipado.integracao.test.ts` e o "plano B0" de `infra/postgres/papeis.sql`.
- O dono decide se as linhas F07 e F08 de `docs/sql/cdd-07-verificacao.sql` saem ou ficam como exceção, já que a issue #11 congela esse SQL.

## Critérios de aceite

- grep por `\b[FI][0-9]{2}\b` e `plano B0` nos arquivos versionados sem ocorrência fora do plano, salvo a exceção que o dono decidir para o SQL de referência

## Referências

- issue #11

_Atualizado em 12/10/2026._
