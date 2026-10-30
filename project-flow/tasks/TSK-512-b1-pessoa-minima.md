# TSK-512: Pessoa mínima (módulo pessoas)

- **Estado:** 🚧 Implementada na branch `codex/tsk-512-pessoa-minima`, aguardando revisão e merge
- **Base da branch:** `codex/tsk-514-parte-b-contas-fundos`
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

`Lancamento.pessoaId` referencia fornecedor (Doc 6 §6, B1). O papel (`Vinculo`) só chega na B2; agora é só o cadastro mínimo. Decisão 3 da TSK-014: o usuário nasce sem Pessoa, e o vínculo usuário-pessoa começa a partir da B1.

## O que precisa ser feito

- Agregado `Pessoa` com nome, tipo (física ou jurídica) e documento (CPF ou CNPJ, só dígitos, único por casa quando presente), com teste de domínio.
- Migration `b1-…` do schema `pessoas` com a tabela `pessoa` inteira, como manda o Doc 7 §25: as colunas que a B4 vai preencher nascem nulas, para não haver migration de reforma com o Financeiro em uso. RLS por instituição, `desfazer.sql` e tipos do Kysely regenerados.
- O domínio fica mínimo: o agregado e os comandos só tratam nome, tipo e documento; as demais colunas ficam nulas até a B4.
- Repositório com trava otimista e outbox; comandos criar e editar; leitura com busca por nome e documento.
- HTTP com marca de acesso e permissão do catálogo; Zod; erros do catálogo.
- Nada de saúde na pessoa (decisão 8 do Doc 7).

## Como ficou (30/10/2026)

- Agregado mínimo `Pessoa`: nome aparado, tipo física/jurídica e documento opcional, só dígitos (11 na física, 14 na jurídica). A edição altera esses campos em conjunto; a validação não calcula dígitos verificadores.
- Migração `b1-003-pessoa-minima`: schema `pessoas`, tabela `pessoa` com a estrutura completa do Doc 7, perfil futuro nulo e flags com os padrões do desenho; RLS forçada, documento único por instituição, privilégios de SELECT/INSERT/UPDATE e reversão própria. Sem coluna de saúde e sem FK entre schemas.
- Repositório Kysely com versão otimista e outbox na mesma transação. Eventos `PESSOA_CADASTRADA` e `PESSOA_EDITADA` carregam só os ids da pessoa e do autor; sem nome ou documento. Não há consumidor nesta etapa, declarado explicitamente no registro de eventos.
- Listagem por nome e id, com paginação por cursor e busca parcial por nome (sem diferenciar maiúsculas) ou documento. Curingas de busca são literais. O limite do cursor no contrato passou a 2048 para comportar nomes Unicode de 200 caracteres.
- Leitura individual, cadastro e edição com as permissões próprias. Edição exige `If-Match`. As respostas têm `Cache-Control: no-store`; comandos usam `@RespostaSemCorpoNoReplay`, também protegido por teste estrutural. O replay da criação devolve status e `Location`, com corpo vazio; o cliente pode reler o recurso pelo `Location`.
- Porta pública `ResumoDaPessoa` publica id, nome, tipo e situação, sem documento. O Financeiro a utiliza para exigir titular existente e ativo na instituição ao criar conta pessoal, concluindo a pendência da TSK-514. Titulares antigos não são alterados ou vinculados automaticamente.
- Os tipos do Kysely foram regenerados do banco migrado e conferidos com `--verificar`.
- A vinculação de usuários ao cadastro de pessoas não ganhou endpoint nesta task; o bootstrap e os usuários existentes continuam como no B0. Vínculos comunitários entram na B2; perfil completo, anamnese e anonimização seguem na B4.

## Endpoints

| Método | Rota (prefixo `/api/v1`) | Permissão |
|---|---|---|
| GET | `/pessoas` | `pessoas.pessoa.ler` |
| GET | `/pessoas/:id` | `pessoas.pessoa.ler` |
| POST | `/pessoas` | `pessoas.pessoa.registrar` |
| PUT | `/pessoas/:id` | `pessoas.pessoa.editar` |

## Validação local (30/10/2026)

- API: 2.180 testes passando e 30 casos futuros (`todo`). Inclui 18 testes de domínio novos e a guarda estrutural de privacidade.
- Integração completa: 685 testes passando. Inclui 19 testes HTTP novos, dois testes da migração e o novo caso de garantias com oito verificações SQL.
- Contratos: 64 testes passando.
- Typecheck, lint de API/contracts, fronteiras, build de contracts/API e conferência dos tipos Kysely passaram.
- Verificações executadas com os binários locais instalados. O gerador de tipos utilizou seu script existente com um adaptador temporário de comando fora do repositório para chamar o codegen instalado, devido à indisponibilidade da troca de versão pelo launcher do pnpm neste ambiente.

## Critérios de aceite

- Teste de integração com vazamento entre instituições.
- Documento duplicado na mesma casa recusado; em outra casa, aceito.

## Referências

- Doc 7 §17 e §25; Doc 6 §6 (B1)

_Atualizado em 30/10/2026._
