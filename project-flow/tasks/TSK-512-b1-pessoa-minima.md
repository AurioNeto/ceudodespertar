# TSK-512: Pessoa mínima (módulo pessoas)

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

`Lancamento.pessoaId` referencia fornecedor (Doc 6 §6, B1). O papel (`Vinculo`) só chega na B2; agora é só o cadastro mínimo. Decisão 3 da TSK-014: o usuário nasce sem Pessoa, e o vínculo usuário-pessoa começa a partir da B1.

## O que precisa ser feito

- Agregado `Pessoa` com nome, tipo (física ou jurídica) e documento (CPF ou CNPJ, só dígitos, único por casa quando presente), com teste de domínio.
- Migration `b1-…` do schema `pessoas` só com a tabela mínima, RLS por instituição, `desfazer.sql` e tipos do Kysely regenerados.
- Repositório com trava otimista e outbox; comandos criar e editar; leitura com busca por nome e documento.
- HTTP com marca de acesso e permissão do catálogo; Zod; erros do catálogo.
- Nada de saúde na pessoa (decisão 8 do Doc 7).

## Critérios de aceite

- Teste de integração com vazamento entre instituições.
- Documento duplicado na mesma casa recusado; em outra casa, aceito.

## Referências

- Doc 7 §17; Doc 6 §6 (B1)

_Atualizado em 14/10/2026._
