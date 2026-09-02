# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 1 de 3 — Arquitetura e Estratégia

**Versão 2.1** · Autor: Aurio Neto · Data: agosto/2026 · Status: consolidado

> **Conjunto documental da v2.0**
> - **Documento 1 — Arquitetura e Estratégia** (este)
> - **Documento 2 — Modelo de Domínio**
> - **Documento 3 — Identidade, Acesso e Permissões**
>
> Os três substituem integralmente a v1.1. Onde houver divergência, prevalece a v2.0.

---

## 0. O que mudou da v1.1 para a v2.0

| # | Mudança | Impacto | Onde |
|---|---|---|---|
| 1 | **`Pessoa` e `Usuario` separados em agregados distintos.** Papel de domínio e perfil de acesso passam a ser eixos independentes. | Estrutural — atinge todos os módulos | Doc 3 |
| 2 | **Grupos de acesso pré-definidos**, com permissões declaradas como códigos. Grupos configuráveis ficam para depois, sem refactor. | Estrutural | Doc 3 |
| 3 | **Novo grupo `ACOLHIMENTO`** — opera inscrições, anamneses e a conversa com quem chega pela primeira vez, sem acesso a movimentação financeira. | Estrutural | Doc 3 §7 |
| 4 | **`RegimeDaUnidade`** (`CONTRIBUICAO` \| `COMERCIAL`). Lojinha e Munay são comerciais. | Estrutural | §4.3 |
| 5 | **`RegimeDeReceita` no `Evento`** (`CONTRIBUICAO` \| `CONTRATADO` \| `INTERNO`), para cobrir cerimônias conduzidas pela Munay em outras instituições. | Estrutural | Doc 2 §2 |
| 6 | **`Pessoa` admite pessoa jurídica** (CNPJ). Contratantes e fornecedores deixam de ser modelados como pessoa física. | Estrutural | Doc 2 §3 |
| 7 | **Operação do evento modelada**: leitos, refeições e ponto de equilíbrio. | Novo escopo | Doc 2 §2 |
| 8 | **Contexto Notificações removido.** Nenhum disparo automático no sistema. Substituído pela **fila de trabalho**. | Reduz escopo e stack | §3, §5.4 |
| 9 | **Importação de extrato bancário (OFX/CSV)** promovida a estratégia principal de captura. Chatbot rebaixado. | Reordena roadmap | §5.3 |
| 10 | **WhatsApp, se viável, apenas para alimentação do Financeiro.** Recepção de participantes é sempre humana. | Restringe escopo | §5.5 |
| 11 | **Prestação de contas por exportação sob demanda**, não por DRE público. | Novo escopo, pequeno | §6 |
| 12 | **Questão da Munay resolvida**: unidade de regime comercial, não tenant separado. | Fecha §13.3.1 da v1.1 | §4.3 |
| 13 | **Read models de evento separados** em arrecadação (Eventos) e resultado/ponto de equilíbrio (Financeiro). | Resolve contradição da v1.1 | Doc 2 §5.3 |
| 14 | **`Apoio` adiado** para depois da v1, sem dívida estrutural. | Reduz escopo | §9.3 |
| 15 | **Conformidade LGPD reposicionada**: mantidos os itens de custo baixo agora; o programa completo passa para depois da adoção. | Reduz escopo, com dívida declarada | §5.6 |

### 0.1 O que mudou da v2.0 para a v2.1

Ajustes decorrentes da validação das seis questões operacionais do Doc 3 §13.

| # | Mudança | Impacto | Onde |
|---|---|---|---|
| 16 | **`Escala` removida do escopo.** Os guardiões são poucos e revezam funções dentro da mesma cerimônia — a atribuição nominal por função e turno não corresponde ao modo real de operar. | Reduz escopo | Doc 2 §2.8 |
| 17 | **Estimativa de consumo de daime.** Projeção por número de consagrantes, usada para planejamento. A baixa de estoque continua exigindo confirmação do volume real. | Novo escopo, pequeno | Doc 2 §4.5 |
| 18 | **`consagra` explícito na `Inscricao`.** Deixa de ser derivado da regra de anamnese, que não cobre a equipe. | Estrutural pequeno | Doc 2 §2.4 |
| 19 | **Grupo `ACOLHIMENTO` passa a se chamar "Acolhimento e Organização"**, com a criação de eventos confirmada como sua atribuição no CDD. | Rótulo e confirmação | Doc 3 §5 |
| 20 | **Tesouraria mantém `eventos.pagamento.registrar`** — não precisa, mas é conveniente que possa. | Confirmação | Doc 3 §6.2 |
| 21 | **Governança confirmada com acesso ao sistema.** O fluxo de autorização de adiantamento permanece como desenhado, sem rota alternativa. | Confirmação | Doc 3 §8.1 |
| 22 | **Escala de uso inicial: ~6 usuários.** Registrada como parâmetro de projeto, com as consequências em §5.8 e Doc 3 §5.4. | Contexto | §5.8 |

---

## 1. Visão geral

### 1.1 Propósito

Construir um sistema de gestão para o Céu do Despertar, centro espiritual que realiza trabalhos com Ayahuasca. O sistema substitui o conjunto atual de planilhas e conversas de WhatsApp por um registro único, auditável e consultável de quatro dimensões da operação: **dinheiro, eventos, pessoas e insumos**.

### 1.2 Motivação concreta

O diagnóstico veio da análise das planilhas em uso e do fluxo real de lançamentos registrados via WhatsApp.

| Problema observado | Consequência hoje | Onde a v2.0 resolve |
|---|---|---|
| Lançamentos chegam como texto livre no WhatsApp e são transcritos à mão | Retrabalho, atraso de semanas, omissão e duplicidade | Doc 2 §1 (`Lancamento`), §5.3 |
| Categorias não carregam natureza — definida pela posição na planilha | A mesma categoria aparece dos dois lados | Doc 2 §1.2 (`Categoria.natureza`) |
| Transferências e empréstimos lançados como despesa | Resultado do período distorcido | Doc 2 §1.4, §1.7 |
| Pagamento de fatura convive com as compras já lançadas | Dupla contagem (~R$ 3,5 mil identificados) | Doc 2 §1.6 (`Fatura`) |
| Categorias sem linha no relatório | R$ 40,6 mil "fora do período" sem ser erro | Doc 2 §1.2 (invariante `linhaRelatorio`) |
| Data da mensagem ≠ data do fato gerador | Competência incorreta | Doc 2 §1.3 (competência) |
| Vínculo despesa↔cerimônia só no texto da descrição | Impossível apurar resultado por cerimônia | Doc 2 §1.3 (`eventoId`) |
| Inscrições em abas despadronizadas, sem total | Nenhuma aba somava o arrecadado | Doc 2 §2 |
| Cartões e contas pessoais custeiam despesas do centro | Patrimônio pessoal e institucional misturados | Doc 2 §1.5, §1.8 |
| Ninguém sabe, antes do trabalho, se ele se paga | Decisão de custo tomada no escuro | Doc 2 §2.8 (ponto de equilíbrio) |
| Não se sabe, antes do trabalho, se há daime suficiente | Feitio ou compra decididos às pressas | Doc 2 §4.5 (consumo estimado) |
| Leitos e refeições contados de cabeça | Compra a mais ou a menos, cama duplicada | Doc 2 §2.5, §2.6 |

O sistema não é um upgrade de planilha: é a formalização de regras de negócio que hoje moram na cabeça de duas ou três pessoas.

### 1.3 Princípios de projeto

1. **O domínio manda.** Modelagem orientada a DDD, com a linguagem do centro (feitio, daime, guardião, cerimônia, acolhimento) refletida no código, no banco e na interface.
2. **Simplicidade sobre sofisticação.** Equipe voluntária e pequena. Monólito modular bem fatiado, não microsserviços. Nenhuma peça de infraestrutura entra sem uso comprovado.
3. **Confiança antes de conveniência.** Dinheiro de comunidade exige trilha de auditoria, imutabilidade de lançamentos confirmados e exportação verificável.
4. **Migração sem ruptura.** Enquanto o sistema não tiver a confiança do grupo, ele convive com — e exporta para — as planilhas.
5. **A recepção é humana.** O sistema apoia o acolhimento; não o substitui. Nenhum fluxo automatizado se interpõe entre o centro e quem chega.
6. **Privacidade com prioridade declarada.** O sistema lida com dado sensível. Na v1 se implementa o que é barato agora e caro depois; o programa completo de conformidade é etapa própria, com data (§5.6).

---

## 2. Linguagem ubíqua (glossário)

Termos extraídos do uso real. Devem aparecer com estes nomes no código, no banco e na interface.

### 2.1 Domínio geral

- **CDD** — Céu do Despertar. O centro.
- **Instituicao** — o *tenant*. Fronteira de isolamento de dados. Hoje há uma: o CDD.
- **Unidade** — centro de custo dentro de uma instituição: CDD, Munay, Chácara, Dormitórios, Lojinha, Pessoal. É dimensão de relatório, não fronteira de segurança.
- **Regime da unidade** — `CONTRIBUICAO` ou `COMERCIAL`. Determina o vocabulário da interface, as categorias disponíveis e a existência de obrigação fiscal sobre a receita.
- **Munay** — grupo musical ligado ao centro. Unidade de **regime comercial**: shows, royalties, estúdio, condução de cerimônias contratadas por outras instituições, MEI próprio.
- **Chácara / Dormitórios / Lojinha** — unidades com receitas e despesas próprias. Lojinha é comercial; Chácara e Dormitórios têm regime a confirmar (§9.4).

### 2.2 Eventos

- **Cerimônia** — trabalho espiritual com consagração do daime. Tipicamente 1×/mês, ocasionalmente 2×.
- **Feitio** — processo ritual de produção do daime. É simultaneamente evento, processo produtivo e centro de custo.
- **Temazcal**, **Jornada**, **Show/Apresentação**, **Encontro** — outros tipos de evento.
- **Regime de receita do evento** — `CONTRIBUICAO` (inscrições e tabela), `CONTRATADO` (valor acordado com um contratante) ou `INTERNO` (sem receita própria).
- **Contratação** — acordo pelo qual a Munay conduz cerimônia ou apresentação para outra instituição, mediante valor combinado.
- **Contratante** — instituição ou pessoa que contrata a Munay. É **contraparte**, nunca tenant.
- **Ficha** — formulário de inscrição/anamnese do participante.
- **Consagração** — participação ritual no trabalho.
- **Consagrante** — quem participa consagrando o daime no trabalho. Inclui a equipe. É a base de contagem do consumo estimado.
- **Consumo estimado** — projeção do volume de daime necessário a um evento, calculada pelo número de consagrantes inscritos. Serve a planejamento; **não movimenta estoque**.
- **Ponto de equilíbrio** — número de contribuições necessário para cobrir o custo previsto do evento.

### 2.3 Pessoas

- **Madrinha / Padrinho** — liderança espiritual. Única instância com autoridade para autorizar adiantamentos e comprometimentos financeiros.
- **Guardião** — função de zelo durante o trabalho. **Voluntária, sem remuneração.**
- **Cuidadora** — responsável pelas crianças que não participam do ritual. **Voluntária.**
- **Criança Estelar** — menor de idade presente no centro durante o trabalho, em duas situações: (a) participando da cerimônia, com autorização formal dos responsáveis; (b) permanecendo nas dependências sob supervisão da cuidadora, sem participar do ritual.
- **Acolhimento** — função de receber quem se inscreve, encaminhar a inscrição, analisar a anamnese e conversar com quem vem pela primeira vez. É função de domínio **e** grupo de acesso homônimo (Doc 3).
- **Músico** — integrante da Munay. Remunerado por cachê.
- **Prestador de serviço** — diarista, jardineiro, pedreiro, eletricista. Remunerado por serviço.
- **Fornecedor** — quem vende bem ou insumo ao centro. Pode ser pessoa física ou jurídica.
- **Apoiador** — pessoa que contribui financeiramente de forma recorrente.
- **Papel** — vínculo da pessoa com a comunidade (o que ela **é**).
- **Perfil / Grupo de acesso** — conjunto de permissões de um usuário (o que ele **pode fazer no sistema**). Eixo independente do papel.

> **Correções herdadas da v1.1, mantidas:** "Zelador Chegou" e "Criança Estelar" em lançamentos de cachê são **nomes de músicas da Munay**, não funções rituais — os pagamentos correspondentes são cachês de músicos. Nenhuma função ritual do centro é remunerada. "Inv. sócios na Chácara" refere-se à **propriedade da terra**; o conceito de "sócio" não existe no domínio e está fora do modelo.

### 2.4 Financeiro

- **Lançamento** — registro de uma movimentação financeira.
- **Categoria** — natureza do gasto/receita (44 em uso).
- **Conta** — origem/destino do dinheiro (9 em uso, incluindo contas pessoais).
- **Caixinha Ayahuasca** — **fundo com destinação vinculada** à aquisição e produção do daime. Não é conta de livre movimentação.
- **Contribuição** — valor pago por participante em evento de regime `CONTRIBUICAO`.
- **Cachê pago** — despesa: pagamento a músico da Munay.
- **Cachê recebido** — receita: valor pago à Munay por contratante externo. **Não confundir com o anterior**; são categorias distintas, de naturezas opostas, no mesmo evento.
- **Adiantamento** — despesa custeada por pessoa física com recursos próprios, a ser ressarcida. Requer autorização de padrinho ou madrinha.
- **Estorno** — reversão de lançamento anterior.
- **Repasse** — transferência de contribuição entre unidades ou a terceiros.
- **Conferência** — revisão humana de lançamento em rascunho antes da confirmação.
- **Conciliação** — casamento entre lançamento do sistema e linha de extrato bancário.
- **Fila de trabalho** — tela única que reúne o que aguarda ação do usuário. Substitui notificações.

> **Nota terminológica.** O vocabulário evita "venda", "cliente" e "preço" **em unidades de regime `CONTRIBUICAO`**. O caráter ali é de contribuição religiosa, não de comércio, e isso tem reflexo jurídico e tributário. Em unidades de regime `COMERCIAL` — Lojinha e Munay — os termos comerciais são não apenas admissíveis como corretos. O `RegimeDaUnidade` é o que torna essa fronteira explícita em vez de convencional, e é justamente por existirem unidades comerciais que o vocabulário de contribuição precisa ser preservado com rigor do outro lado.

---

## 3. Contextos delimitados (Bounded Contexts)

### 3.1 Mapa de contextos

```
┌───────────────────────────────────────────────────────────────────┐
│                          CORE DOMAIN                              │
│                                                                   │
│   ┌──────────────┐   eventos de     ┌──────────────┐              │
│   │              │  ──────────────► │              │              │
│   │   EVENTOS    │   integração     │  FINANCEIRO  │              │
│   │              │ ◄──────────────  │              │              │
│   └──────┬───────┘  porta de        └──────┬───────┘              │
│          │          consulta               │                      │
│          │          (custos)               │                      │
│          │  ┌───────────────┐              │                      │
│          └─►│    ESTOQUE    │◄─────────────┘                      │
│             │ (simplificado)│                                     │
│             └───────┬───────┘                                     │
└─────────────────────┼─────────────────────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │          PESSOAS           │  ← upstream de todos
        │     (Published Language)   │
        └─────────────┬──────────────┘
                      │  PessoaId
        ┌─────────────▼──────────────┐
        │   IDENTIDADE E ACESSO      │  Usuario, Grupo, Permissao
        │   (parte genérica:         │
        │    Keycloak)               │
        └────────────────────────────┘

        ┌────────────────────────────┐
        │   SUPPORTING / GENERIC     │
        │   · Arquivos e Anexos      │
        └────────────────────────────┘
```

**Diferenças em relação ao mapa da v1.1:**

- **Notificações foi removido.** Não há disparo automático de e-mail, SMS ou mensagem em nenhum ponto do sistema (§5.4).
- **Identidade e Acesso deixou de ser puramente genérico.** A autenticação continua terceirizada ao Keycloak, mas `Usuario`, `Grupo` e o catálogo de permissões são modelo próprio, porque a fronteira do grupo `ACOLHIMENTO` é regra de negócio do centro e não configuração de produto (Doc 3).

### 3.2 Classificação estratégica

| Contexto | Tipo | Justificativa |
|---|---|---|
| **Financeiro** | Core | Maior dor e maior diferencial. Unidades com regimes distintos, fundo vinculado, adiantamentos, feitio como centro de custo — nada disso existe em produto de prateleira. |
| **Eventos** | Core | Modelo de contribuição, anamnese obrigatória, operação (leitos/refeições) e evento contratado são específicos. |
| **Pessoas** | Core (com partes genéricas) | Cadastro é genérico; papéis do centro, anamnese versionada e autorização de menores são núcleo. |
| **Identidade e Acesso** | Supporting | Autenticação comprada; autorização modelada (Doc 3). |
| **Estoque** | Supporting | Deliberadamente simplificado. Existe para rastrear daime e insumos de cerimônia. |
| **Arquivos** | Generic | Storage S3-compatível. |

### 3.3 Relações entre contextos

| Origem → Destino | Padrão | Descrição |
|---|---|---|
| Pessoas → todos | **Published Language** | Publica contrato estável (`PessoaId`, nome exibido, tipo, papéis ativos). Demais contextos guardam a referência e um cache mínimo de exibição. Nunca acessam tabelas de Pessoas. |
| Identidade → todos | **Published Language** | Publica `UsuarioId`, `PessoaId` associado e conjunto de permissões efetivas. |
| Eventos → Financeiro | **Customer/Supplier** via evento de domínio | `PagamentoDeContribuicaoConfirmado` e `ContratacaoRealizada` geram lançamento de receita vinculado ao evento. |
| Financeiro → Eventos | **Open Host Service** (consulta) | Eventos consulta custos por `eventoId` quando precisa. Não lê o banco do Financeiro. |
| Estoque → Financeiro | **Customer/Supplier** | Compra de insumo sugere lançamento; feitio produz custo de produção. |
| Eventos → Estoque | **Customer/Supplier** | `EventoRealizado` cria pendência de registro de consumo. |

> **Regra de ouro.** Nenhum módulo importa entidade de domínio de outro. A comunicação é por evento (assíncrono in-process, com Outbox quando cruza transação) ou por porta de consulta explícita (síncrona). Isso preserva a opção futura de extrair um módulo sem reescrita.

---

## 4. Arquitetura de aplicação

### 4.1 Estilo arquitetural

**Monólito modular** com fronteiras estritas — não microsserviços.

A equipe é pequena e voluntária; a escala é de centenas de pessoas e centenas de lançamentos por ano. Microsserviços adicionariam custo operacional (deploy, observabilidade distribuída, consistência eventual entre bancos) sem benefício algum. A modularidade rigorosa preserva a opção de extrair um módulo, se um dia fizer sentido.

### 4.2 Multi-tenancy

O sistema nasce preparado para múltiplas instituições, ainda que opere apenas para o CDD. A decisão é estruturante e barata agora; retrofit posterior seria caro e arriscado.

#### Três níveis de agrupamento — não confundir

| Conceito | O que é | Fronteira | Exemplo |
|---|---|---|---|
| **`Instituicao`** | Tenant. Organização cliente do sistema. | **Segurança.** Isolamento total de dados. | Céu do Despertar |
| **`Unidade`** | Centro de custo dentro de uma instituição. | **Relatório.** | CDD, Munay, Chácara, Dormitórios, Lojinha, Pessoal |
| **Contraparte** | Pessoa física ou jurídica externa com quem se transaciona. | **Nenhuma.** É dado de cadastro. | Instituto Terra, Céu Sagrado, fornecedores |

Um centro que contrata a Munay é **contraparte**, não tenant. Ele não tem acesso ao sistema e seus dados vivem dentro da instituição CDD.

#### Estratégia de isolamento

**Banco único, schema por módulo, discriminador `instituicao_id` + Row-Level Security do PostgreSQL.**

```sql
ALTER TABLE financeiro.lancamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON financeiro.lancamento
  USING (instituicao_id = current_setting('app.instituicao_id')::uuid);
```

| Estratégia | Isolamento | Custo operacional | Veredito |
|---|---|---|---|
| Schema compartilhado + RLS | Bom (garantido pelo banco) | Baixo | **Escolhida** |
| Schema por tenant | Muito bom | Médio (migrations × N) | Rejeitada por ora |
| Banco por tenant | Máximo | Alto | Só se exigido por contrato |

**Por que RLS e não apenas filtro na aplicação:** um `WHERE instituicao_id = ?` esquecido vaza dados entre instituições. RLS torna o isolamento uma garantia do banco, não uma disciplina do desenvolvedor. Com um único tenant hoje, o custo é praticamente nulo e o hábito fica estabelecido.

#### Implementação

- Middleware resolve a instituição a partir do token e injeta em contexto *request-scoped*.
- `SET LOCAL app.instituicao_id` no início de cada transação.
- `instituicaoId` faz parte da identidade de todo agregado — está no construtor, não é opcional.
- Filtro global do MikroORM como segunda camada (defesa em profundidade).
- Teste de integração com **caso explícito de tentativa de vazamento cross-tenant**.

### 4.3 Unidade e regime — decisão tomada

```typescript
type RegimeDaUnidade = 'CONTRIBUICAO' | 'COMERCIAL';

class Unidade {
  readonly id: UnidadeId;
  readonly instituicaoId: InstituicaoId;
  readonly codigoSistema: string;        // 'CDD', 'MUNAY', 'LOJINHA'
  private nome: string;                  // rótulo editável
  private regime: RegimeDaUnidade;
  private documentoFiscal: CNPJ | null;  // MEI da Munay
  private tetoFaturamentoAnual: Dinheiro | null;  // parâmetro, nunca constante
  private ativa: boolean;
}
```

| Unidade | Regime | Observação |
|---|---|---|
| CDD | `CONTRIBUICAO` | Vocabulário de contribuição obrigatório |
| Lojinha | `COMERCIAL` | Vende mercadoria (camisetas) |
| Munay | `COMERCIAL` | Shows, royalties, estúdio, cerimônias contratadas; MEI próprio |
| Chácara | *a confirmar* | Comercial se houver cessão/locação fora de trabalho |
| Dormitórios | *a confirmar* | O beliche dentro da cerimônia é adicional de contribuição; hospedagem avulsa seria comercial |
| Pessoal | `CONTRIBUICAO` | Unidade técnica, sem receita própria |

**O que o regime governa:**

1. **Vocabulário da interface.** Unidade comercial exibe *venda*, *cliente*, *preço*. Unidade de contribuição exibe *contribuição*, *participante*, *valor sugerido*.
2. **Categorias disponíveis.** O plano de contas filtra por regime — não se lança "Contribuição CDD" na Lojinha nem "Venda de mercadoria" no CDD.
3. **Obrigação fiscal.** Receita de unidade comercial é candidata a nota fiscal, sob o CNPJ da unidade.

**Isto encerra a questão aberta §13.3.1 da v1.1.** A Munay não é tenant separado: é unidade de regime comercial, com MEI próprio, compartilhando pessoas, infraestrutura e caixa no dia a dia — que era a inclinação já registrada. A pergunta para a contabilidade deixa de ser "tenant ou unidade" e passa a ser **"quais unidades emitem nota e sob qual CNPJ"**, que um contador responde sem precisar entender arquitetura.

**Read model derivado:** faturamento acumulado no ano-calendário por unidade comercial, contra o teto do regime tributário. Apresentado como indicador no painel da unidade, não como alerta (não há notificações). O teto é **parâmetro da unidade**, nunca constante no código — esse valor muda por lei.

### 4.4 Stack

| Camada | Escolha | Justificativa |
|---|---|---|
| Runtime | **Node.js 22 LTS + TypeScript 5.x** (`strict: true`) | Definido pelo time. Tipagem forte é essencial para expressar VOs e invariantes. |
| Framework | **NestJS** | Módulos mapeiam 1:1 com bounded contexts; DI nativa viabiliza a inversão exigida pela arquitetura hexagonal. |
| ORM | **MikroORM** | Data Mapper + Unit of Work + Identity Map, adequado a DDD. Prisma é produtivo, mas seu modelo anêmico atrita com agregados ricos. |
| Banco | **PostgreSQL 16** | Transacional, `numeric` exato, JSONB, schemas por módulo, RLS. |
| Migrations | MikroORM Migrations | Versionamento de schema e seeds. |
| Eventos internos | Event bus in-process + **padrão Outbox** | Simples, com durabilidade quando o evento cruza transação. |
| Frontend | **React 19 + TypeScript + Vite** (PWA) | Ecossistema maduro; PWA atende o requisito mobile. |
| UI | Tailwind + shadcn/ui | Velocidade com equipe reduzida. |
| Autenticação | **Keycloak** self-hosted | Não construir autenticação. Entrega login, MFA e federação. **A autorização é do domínio** (Doc 3). |
| Arquivos | S3-compatível (**Cloudflare R2** ou MinIO) | Comprovantes precisam de storage durável e barato. |
| Parsing OFX | `ofx-js` ou equivalente | Importação de extrato (§5.3). |
| Observabilidade | Pino + OpenTelemetry + Sentry | Log estruturado e rastreio de erro. |
| Testes | Vitest + Testcontainers + Playwright | Unidade no domínio (sem I/O), integração com Postgres real, E2E nos fluxos críticos. |
| Deploy | Docker + Railway/Fly.io/VPS | Orçamento contido; sem Kubernetes. |

**Removidos em relação à v1.1:** BullMQ e Redis. A v1.1 os justificava por notificações e relatórios pesados. Não há notificações (§5.4) e, nesta escala, não há relatório pesado. Uma peça a menos para manter. Se a importação de OFX exigir processamento assíncrono, revisita-se — mas o volume não sugere isso.

### 4.5 Estrutura de pastas

```
repo/
├── packages/
│   └── contracts/                 tipos compartilhados front ↔ back
├── apps/
│   ├── web/                       React + Vite (PWA)
│   └── api/
│       └── src/
│           ├── modules/
│           │   ├── financeiro/
│           │   │   ├── domain/
│           │   │   │   ├── entities/         Lancamento, Conta, Fatura...
│           │   │   │   ├── value-objects/    Dinheiro, Competencia, Natureza
│           │   │   │   ├── events/           LancamentoConfirmado...
│           │   │   │   ├── services/         regras fora de um agregado
│           │   │   │   └── repositories/     INTERFACES apenas (portas)
│           │   │   ├── application/
│           │   │   │   ├── commands/
│           │   │   │   ├── queries/
│           │   │   │   └── event-handlers/
│           │   │   ├── infrastructure/
│           │   │   │   ├── persistence/      MikroORM + mappers
│           │   │   │   ├── acl/              tradutores de eventos externos
│           │   │   │   ├── importacao/       parsers OFX/CSV
│           │   │   │   └── projections/      read models
│           │   │   └── interface/http/       controllers, DTOs, Zod
│           │   ├── eventos/
│           │   ├── pessoas/
│           │   ├── identidade/
│           │   └── estoque/
│           ├── shared/
│           │   ├── kernel/        Entity, AggregateRoot, DomainEvent, Result
│           │   ├── types/         branded types para IDs
│           │   └── infrastructure/ event bus, outbox, storage, auth
│           └── main.ts
```

**Regra de dependência (verificada por lint):** `domain` não importa de `application`, `infrastructure` ou `interface`. `application` importa apenas `domain`. Módulos não importam o `domain` uns dos outros. Ferramentas: `eslint-plugin-boundaries` ou `dependency-cruiser` na CI.

### 4.6 Padrões táticos

- **CQRS leve** — comandos passam por agregados; consultas vão direto a read models via SQL. Sem event sourcing.
- **Result pattern** para erro de regra de negócio — `Result<T, DomainError>`. Exceções ficam para falha de infraestrutura.
- **Branded types** para IDs:
  ```typescript
  type PessoaId = string & { readonly __brand: 'PessoaId' };
  ```
- **Factory methods** nos agregados (`Lancamento.registrar(...)`) em vez de construtores públicos.
- **Specification pattern** para regras compostas de consulta.
- **Códigos de sistema** (`codigoSistema`) em todo registro parametrizável cujo valor específico seja referenciado por regra de negócio. O domínio referencia o código; o rótulo exibido permanece editável. Vale para `Unidade`, `Categoria`, `Papel`, `Permissao`, `Grupo`.

### 4.7 Persistência

Um schema PostgreSQL por módulo: `financeiro`, `eventos`, `pessoas`, `identidade`, `estoque`, `shared`.

Chaves estrangeiras **não cruzam schemas** — a referência entre contextos é por ID, sem integridade referencial no banco, exatamente como seria entre serviços. Isso força a disciplina de fronteira e é verificado por revisão de migration.

Toda tabela de domínio carrega `instituicao_id` com RLS ativa (§4.2).

Dinheiro em inteiro de centavos (`bigint`) ou `numeric(14,2)`. Nunca `float`/`double`.

### 4.8 Parametrização — fixo primeiro, configurável depois

| Elemento | v1 | Depois |
|---|---|---|
| Categorias e unidades | Seed em migration | CRUD para administradores |
| Contas e fundos | Seed | CRUD |
| Papéis de domínio | Enum em código | Cadastráveis, com governança protegida |
| **Grupos de acesso** | **Seed com 6 grupos (Doc 3 §5)** | **CRUD de grupos, montando conjuntos de permissões** |
| Permissões | Catálogo fixo em código | Fixo (é o vocabulário; não vira cadastro) |
| Tabela de contribuição | Seed por evento | Editável na criação do evento |
| Formulário de anamnese | Seed da v1 do formulário | Editor de formulário |
| Teto de faturamento | Parâmetro da unidade, editável desde a v1 | — |

**Cuidado permanente:** quando qualquer desses elementos virar cadastrável, a regra de negócio não pode depender do *nome* digitado. Ela referencia `codigoSistema`. Isso vale especialmente para `Fundo.categoriasPermitidas`, para a exigência de papel `PADRINHO`/`MADRINHA` no adiantamento e para toda checagem de permissão.

---

## 5. Requisitos não funcionais

### 5.1 Auditoria e confiança

Dinheiro de comunidade exige mais rigor que dinheiro de empresa — a legitimidade da gestão depende de transparência verificável.

- Lançamento confirmado é imutável; correção só por estorno rastreável.
- Toda operação registra autor (`UsuarioId`), timestamp e origem.
- Fechamento mensal gera relatório com hash, assinado pela tesouraria.
- Exportação verificável para planilha, permitindo conferência independente.
- Log de acesso a dado sensível: **implementado desde a v1** para respostas de anamnese (§5.6).

### 5.2 Disponibilidade e operação

- Escala esperada: 50–300 pessoas cadastradas, 15–20 eventos/ano, 500–600 lançamentos/ano (279 até julho de 2026). **Carga baixíssima.** Otimizar para custo e simplicidade, não throughput.
- Backup diário automatizado, com teste de restauração trimestral.
- RTO 24h / RPO 24h aceitáveis.
- Conectividade instável na chácara é fato conhecido; tratada por PWA com fila offline na fase de captura assistida (§5.3, estratégia 5).

### 5.3 Usabilidade e captura — o requisito que decide o sucesso

O risco maior do projeto não é técnico. **É o sistema ser mais trabalhoso que mandar uma mensagem no WhatsApp.** Se for, as pessoas voltam ao WhatsApp e o sistema morre.

Requisitos derivados:

- **Lançamento em menos de 30 segundos pelo celular.** PWA, formulário curto, valores padrão inteligentes (conta mais usada pelo usuário, data de hoje, unidade do último lançamento).
- **Anexar comprovante direto da câmera ou galeria**, em um toque.
- **Nada bloqueia o registro.** Campo incerto vira rascunho com pendência, não impedimento.

#### Portfólio de estratégias de captura

Ordenadas por relação esforço/impacto. A ordem mudou em relação à v1.1: a importação de extrato subiu, o chatbot desceu.

| # | Estratégia | Como funciona | Fase | Observações |
|---|---|---|---|---|
| 1 | **Formulário rápido (PWA)** | Tela mobile-first, padrões inteligentes, comprovante pela câmera | 1 | Linha de base obrigatória. Se isto não for bom, nada mais salva. |
| 2 | **Registro em rascunho + fila de conferência** | Quem gasta registra rápido em `RASCUNHO`; quem confere revisa e confirma em tela de fila | 1 | Alto valor, baixo custo. Reaproveita o status `RASCUNHO` do modelo. Materializa a separação de permissões `registrar` × `confirmar` (Doc 3). |
| 3 | **Importação de extrato bancário (OFX/CSV)** | Importa o extrato de Cora, Nubank, Itaú, C6; o sistema propõe lançamentos e casa com os já registrados | 2 | **Promovida a estratégia principal.** Ver abaixo. |
| 4 | **Conciliação** | Casa lançamento do sistema × linha de extrato; expõe o que sobra dos dois lados | 2 | Nasce junto com a importação; é o que a torna útil. |
| 5 | **PWA com fila offline** | Registra sem conexão, sincroniza depois | 6 | Necessário pela conectividade da chácara. Exige idempotência e tratamento de conflito. |
| 6 | **Ponte de transição (importação de texto)** | Cola o texto das mensagens; o sistema propõe lançamentos estruturados; humano confirma | 6 | Preserva o hábito atual. Útil também na migração do histórico. |
| 7 | **Alimentação via WhatsApp** | Comprovante e dados enviados por lá, virando rascunho na fila | 6, **se viável** | Ver §5.5. |

**Por que a importação de OFX subiu para a fase 2:**

- resolve `dataCaixa` sem digitação;
- **detecta o lançamento esquecido** — o problema de omissão é hoje invisível, porque nada denuncia o que não foi registrado;
- alimenta a mesma fila da estratégia 2, já com dado estruturado e confiável;
- não depende de mudança de comportamento de ninguém;
- ataca o mesmo problema do chatbot por um caminho mais barato e sem risco de extração errada.

As duas fontes se complementam: o registro humano (ou o WhatsApp) traz a **intenção** — o que foi, para quê, para qual cerimônia; o extrato traz a **verdade bancária** — valor exato e data de caixa. As duas caem na mesma fila e a conferência vira conciliação, que é onde o retrabalho de hoje realmente mora.

**Princípio inegociável em qualquer estratégia automatizada:** o sistema **propõe**, o humano **confirma**. Lançamento financeiro criado sem revisão destrói a confiança — e confiança é o ativo principal aqui.

### 5.4 Sem notificações — decisão tomada

**Não há disparo automático de notificação em nenhuma parte do sistema.** Sem e-mail, sem SMS, sem push, sem mensagem. O contexto Notificações foi removido do mapa (§3.1) e nenhum handler de notificação assina evento de domínio.

**Os eventos de domínio permanecem todos** — eles alimentam projeção e auditoria, que é a função primária deles.

**O que seria notificação vira fila de trabalho.** Uma tela de *"o que precisa de você"*, alimentada pelos read models que já existem, filtrada pelas permissões do usuário:

| Item da fila | Quem vê | Read model de origem |
|---|---|---|
| Lançamentos em rascunho aguardando conferência | Tesouraria, Administrador | Fila de conferência |
| Linhas de extrato sem lançamento correspondente | Tesouraria, Administrador | Conciliação |
| Adiantamentos pendentes de ressarcimento | Tesouraria, Governança | Reembolsos pendentes |
| Período do mês anterior ainda aberto | Tesouraria | Períodos contábeis |
| Faturamento da unidade comercial vs. teto | Administrador, Governança | Faturamento por unidade |
| Inscrições com anamnese pendente | Acolhimento | Pendências de anamnese |
| Menores sem autorização de responsável | Acolhimento | Pendências de autorização |
| Saldo de daime abaixo do consumo estimado do próximo evento | Acolhimento, Administrador | Consumo estimado × saldo |
| Consumo de daime não registrado após evento realizado | Estoque | Pendências de consumo |

Para equipe voluntária isso tende a funcionar melhor que aviso automático: um lugar só, consultado quando a pessoa senta para trabalhar, em vez de oito mensagens que ninguém lê. E elimina a categoria inteira de problemas de entregabilidade, opt-out e preferência por canal.

### 5.5 WhatsApp — escopo restrito e condicional

**Decisão:** se o WhatsApp for usado, será **exclusivamente para alimentação do Financeiro** — envio de comprovantes e dados de lançamento, que entram como rascunho na fila de conferência.

**Não haverá WhatsApp para:**
- inscrição em cerimônia;
- atendimento a participantes;
- confirmação de presença;
- qualquer forma de recepção.

> **A recepção é sempre humana.** Quem chega ao centro conversa com uma pessoa do acolhimento — não com um bot, não com um formulário automatizado. Isso é princípio de projeto (§1.3), não limitação técnica, e restringe inclusive o Portal do Participante (§9.2, Fase 5).

**Sobre a viabilidade.** A avaliação da v1.1 ("provavelmente inviável") foi feita pensando em **envio** — mensagens de template, aprovação da Meta, custo por conversa iniciada pela organização. **Recepção é outro produto**: a conversa é iniciada pelo usuário, o volume é baixo e o fluxo é unidirecional. A conclusão anterior pode não valer para este uso. Os termos e custos da API mudaram algumas vezes desde 2024 e precisam ser verificados no momento da decisão, não antes.

**Alternativas se não for viável:** Telegram (API aberta, custo zero) ou o próprio PWA com uma tela de "registro rápido". O modelo de domínio é indiferente ao canal — todos desembocam no mesmo `Lancamento` em `RASCUNHO`.

### 5.6 LGPD — prioridade declarada e dívida assumida

O sistema processa duas categorias de dado pessoal sensível (Lei 13.709/2018, art. 5º, II):

1. **Dados de saúde** — ficha de anamnese, medicações, histórico.
2. **Convicção religiosa** — a mera participação em trabalhos do centro revela filiação religiosa. **A lista de participantes de uma cerimônia é, por si só, um conjunto de dados sensíveis.**

**Decisão de sequenciamento:** a prioridade imediata é substituir o amálgama de planilhas desconexas. O programa completo de conformidade — termo de consentimento, política de retenção, expurgo, procedimento de incidente — é etapa própria, **pré-requisito da Fase 5 (Portal)**, não da v1.

**O que entra na v1 mesmo assim**, por ser barato agora e caro depois:

| Item | Por que agora | Custo |
|---|---|---|
| Coluna `sensivel` na `Pergunta` do formulário | Retrofit exigiria reclassificar respostas já coletadas | Nenhum |
| Acesso à anamnese restrito por permissão | É a fronteira do grupo `ACOLHIMENTO`, que já se está construindo | Nenhum |
| Log de acesso a resposta de anamnese | Tabela de log é trivial; reconstruir histórico é impossível | Muito baixo |
| Agregado `Consentimento` modelado (mesmo sem termo redigido) | A estrutura fica pronta; só falta o texto | Muito baixo |
| Anexos por URL assinada de curta duração, nunca link público | Link público vazado não se recolhe | Baixo |
| Anonimização preservando integridade contábil | Precisa estar previsto no modelo desde o início | Baixo |

**O que fica declaradamente para depois:** criptografia em nível de coluna, política de retenção e expurgo automático, termo de consentimento redigido, procedimento de notificação à ANPD, revisão de minimização dos campos herdados das planilhas.

**Dívida registrada:** enquanto isso não existir, o sistema tem controle de acesso mas não tem programa de conformidade. Isso é aceitável enquanto o uso for interno e a base for a atual. **Deixa de ser aceitável quando o Portal do Participante expuser o sistema a usuários externos** — daí o pré-requisito da Fase 5.

### 5.7 Internacionalização

Interface em português brasileiro. Moeda BRL. Fuso `America/Sao_Paulo`. Não há necessidade de i18n — não introduzir a complexidade.

### 5.8 Escala de uso — parâmetro de projeto

**Cerca de seis pessoas terão login na largada**, com expansão prevista. Não é detalhe: muda o que faz sentido construir.

**O que isso confirma:**

- **Monólito modular e RTO/RPO de 24h estão certos.** Não há caso para alta disponibilidade.
- **A fila de trabalho substitui notificação com folga.** Com seis pessoas, o combinado sobre quem olha o quê se faz por conversa; o sistema só precisa mostrar o que está pendente.
- **A conciliação bancária vale mais que a conferência humana.** Em equipe pequena, quem registra e quem confere tende a ser a mesma pessoa em dias diferentes. Fonte externa é controle melhor que segunda leitura.

**O que isso põe em risco:**

- **O atalho do acesso pleno.** Com seis pessoas que se conhecem, a tentação de dar `ADMINISTRADOR` a todos é grande, e ela anula o desenho inteiro do Doc 3. A mitigação é ter a matriz escrita e revisá-la — não é técnica.
- **Grupos sem usuário.** `REGISTRO` e `LEITURA` provavelmente começam vazios. Ficam no seed mesmo assim, porque custam uma linha de array e os testes de autorização os cobrem independentemente de haver gente neles. Grupo que só nasce quando é preciso nasce sem teste e sem revisão.
- **Concentração de conhecimento.** Seis usuários significam que uma ou duas pessoas sabem operar cada módulo. Isso é argumento a favor de interface óbvia e contra qualquer sofisticação que exija treinamento.

---

## 6. Prestação de contas

**Decisão:** não haverá DRE público nem painel aberto a todos os membros.

A prestação de contas se dá por **exportação sob demanda**, gerada por padrinhos, madrinhas ou administradores quando alguém pede — reproduzindo o resumo do painel, em formato apresentável e arquivável.

```typescript
class PrestacaoDeContas {
  readonly id: PrestacaoId;
  readonly unidadeId: UnidadeId | null;      // null = consolidado
  readonly periodo: IntervaloDeCompetencia;
  readonly geradaPor: UsuarioId;
  readonly geradaEm: DateTime;
  readonly nivelDeDetalhe: NivelDeDetalhe;
  readonly hash: string;                      // integridade do documento
  readonly arquivo: Anexo;                    // PDF ou XLSX
}

type NivelDeDetalhe =
  | 'RESUMO'          // totais por categoria e linha de relatório
  | 'DETALHADO';      // lançamento a lançamento
```

**Conteúdo do nível `RESUMO`** — o que a maioria dos pedidos requer:

- Receitas por categoria, no período.
- Despesas por categoria, no período.
- Resultado do período.
- Saldos por conta ao início e ao fim.
- Saldo do Fundo Ayahuasca e sua movimentação.
- Resultado por cerimônia realizada no período.

**Supressão de identidade.** No nível `RESUMO`, nomes de pessoas físicas não aparecem. *"Empréstimo concedido a Fulano: R$ 4.800"* expõe uma pessoa; *"Empréstimos concedidos: R$ 4.800"* presta a mesma conta sem expor ninguém. O nível `DETALHADO` mantém os nomes e é de uso interno — permissão restrita a Administrador, Tesouraria e Governança (Doc 3).

**Rastreabilidade.** Toda prestação gerada fica registrada: quem gerou, quando, qual período, qual nível, qual hash. Isso permite que dois pedidos diferentes sejam conferidos entre si, e dá à governança o registro do que já foi entregue a quem.

---

## 7. Migração das planilhas

### 7.1 Dados a migrar

| Origem | Volume | Destino |
|---|---|---|
| Aba `Categorias` | 44 categorias, 6 grupos, 9 contas | `PlanoDeContas`, `Unidade`, `Conta` |
| Aba `Lançamentos` | ~1.760 linhas (2022–2026) | `Lancamento` |
| Planilha de entradas | ~15 abas de cerimônia | `Evento` + `Inscricao` + `Pessoa` |
| Lista de equipe/staff | ~16 pessoas | `Pessoa` + `Vinculo` |
| Aba `Soma Ayahuasca` | cálculo de daime | `Item`, `Lote` |

### 7.2 Decisões humanas necessárias antes da carga

A migração **não é automática**. Os itens abaixo exigem decisão de negócio:

1. **Natureza de cada categoria** (receita ou despesa) — hoje implícita na posição do relatório.
2. **Regime de cada categoria** — quais pertencem a unidade comercial e quais a unidade de contribuição (novo na v2.0).
3. **31 lançamentos sinalizados** na extração do WhatsApp: categoria, grupo ou conta incertos, possíveis duplicatas, valores compostos.
4. **Reclassificação de transferências e empréstimos** hoje lançados como despesa.
5. **Faturas de cartão** — identificar quais pagamentos duplicam compras já lançadas.
6. **Deduplicação de pessoas** — nomes escritos de formas diferentes entre abas; há um e-mail no lugar de um nome.
7. **Classificação pessoa física × jurídica** dos fornecedores (novo na v2.0).
8. **Vínculo retroativo despesa↔cerimônia** — a informação está no texto ("mercado cerimônia", "verduras cerimônia mãe divina"). Decidir se vale o esforço no histórico ou só daqui para frente.
9. **Reclassificação de cachês** — "cachê ... Zelador e criança estelar" são pagamentos a músicos da Munay: papel `MUSICO`, unidade Munay.
10. **Separação cachê pago × cachê recebido** — se houver receita de contratação no histórico, ela está hoje possivelmente na mesma categoria do pagamento aos músicos (novo na v2.0).
11. **Data de competência do histórico** — extrair a data real entre parênteses na descrição para `dataCompetencia`, mantendo a data da mensagem em `dataCaixa`.

### 7.3 Estratégia

**Migração incremental com convivência**, não big bang:

1. Carga do plano de contas, unidades (com regime) e pessoas.
2. Carga do histórico financeiro em modo somente leitura, para relatório comparativo.
3. Operação em paralelo por 2–3 meses: lança-se nos dois lugares, compara-se o fechamento mensal.
4. Corte quando o fechamento bater por dois meses consecutivos.
5. Exportação para planilha mantida indefinidamente — é rede de segurança e ferramenta de auditoria.

---

## 8. Método de desenvolvimento

### 8.1 Design-first

Cada fatia vertical percorre três etapas, nesta ordem:

```
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │  1. DESIGN   │ ──► │ 2. FRONT-END │ ──► │  3. BACKEND  │
   │              │     │ (código,     │     │ (implementa  │
   │              │     │  com mocks)  │     │  o contrato) │
   └──────────────┘     └──────────────┘     └──────────────┘
         │                     │                     │
    telas e fluxos      tipos, DTOs,          agregados que
    validados com       estados de UI,        satisfazem os
    quem vai usar       contrato de API       contratos
```

**Por que assim, contrariando a ordem usual:**

1. **Fonte da verdade mais rica para o backend.** A interface pronta explicita estados, campos, validações e fluxos de erro que uma especificação textual deixa implícitos.
2. **Validação com o usuário antes do custo alto.** A tesouraria opina sobre uma tela; não opina sobre um diagrama de agregados. O requisito dos 30 segundos é verificável no protótipo.
3. **É onde está a maior especialidade do time.** Começar pelo terreno firme reduz risco de paralisação.

**Risco e mitigação.** Desenhar a interface antes do domínio pode produzir telas que violam invariantes — a clássica tela que permite editar lançamento já confirmado. **A mitigação é este conjunto documental:** o Documento 2 é o guarda-corpo do design, e o Documento 3 é o guarda-corpo de quem vê o quê. Regra prática: a interface pode **restringir** o domínio, nunca **contradizê-lo**.

**Nova mitigação na v2.0:** todo protótipo de tela é desenhado **para um grupo de acesso específico**. Não existe "a tela de evento" — existe a tela de evento como o Acolhimento a vê e a tela de evento como a Tesouraria a vê. Isso evita a armadilha de desenhar a tela completa e depois esconder campos, que é como vazamento de permissão nasce.

**Saídas obrigatórias de cada etapa:**

| Etapa | Saída que alimenta a próxima |
|---|---|
| Design | Telas navegáveis por grupo de acesso, estados vazio/erro/carregando, design system, vocabulário conferido com o glossário (§2) e com o regime da unidade (§4.3) |
| Front-end | Tipos TypeScript, contrato de API (OpenAPI ou tRPC), fixtures com casos reais — inclusive os casos-limite do Anexo A |
| Backend | Implementação dos contratos, invariantes de domínio, testes de autorização (Doc 3 §11) |

Os tipos criados no front-end tendem a virar a base do contrato. Mantê-los em `packages/contracts` desde o primeiro commit é o que faz o método render no backend.

---

## 9. Roadmap

### 9.1 Fase 0 — Fundação (2–3 semanas)

Design system, identidade visual, componentes base. Em paralelo: monorepo com `packages/contracts`, CI/CD, banco, Keycloak, RLS multi-tenant, **modelo de identidade e acesso do Doc 3**, deploy do esqueleto.

**Entrega:** design system aprovado + aplicação vazia em produção, com login e os seis grupos de acesso funcionando.

> O modelo de acesso entra na Fase 0, não depois. É pré-requisito de todas as telas seguintes, porque cada uma é desenhada por grupo (§8.1).

### 9.2 Fases funcionais

#### Fase 1 — Financeiro (design → front → back)

Maior valor, modelo mais maduro.

- **1a — Design:** lançamento rápido, fila de conferência, plano de contas, DRE, fluxo de caixa, reembolsos pendentes, prestação de contas. Validação com a tesouraria.
- **1b — Front-end:** telas com dados mockados, contrato de API definido.
- **1c — Backend:** `Lancamento`, `Transferencia`, `Conta`, `Fatura`, `Emprestimo`, `Adiantamento`, `Fundo`, `PeriodoContabil`, `Unidade` com regime; projeções; migração do histórico.

**Marco de validação:** fechamento mensal do sistema bate com o da planilha por dois meses consecutivos.

#### Fase 2 — Importação e conciliação bancária

Importação de OFX/CSV, motor de casamento, fila de conciliação, faturamento por unidade comercial vs. teto.

**Entrega:** o lançamento esquecido deixa de ser invisível. É o que consolida a confiança conquistada na Fase 1.

#### Fase 3 — Pessoas e anamnese

Cadastro (física e jurídica), papéis, vínculos; editor de formulário versionado; resposta incremental; autorização de responsável; `Consentimento` modelado.

#### Fase 4 — Eventos

`Evento` com os três regimes de receita, `Contratacao`, tabela de contribuição, inscrições, pagamentos, devoluções, operação (leitos e refeições), ponto de equilíbrio, integração com Financeiro.

**Entrega:** substitui a planilha de entradas e o Resumo de Cerimônias.

#### Fase 5 — Estoque

Itens, lotes, movimentos, feitio, consumo estimado, consumo real por cerimônia discriminado por lote, custo por litro produzido.

**Entrega:** substitui a aba Soma Ayahuasca.

#### Fase 6 — Portal do participante

**Pré-requisito não técnico:** programa de conformidade LGPD concluído (§5.6) — termo de consentimento redigido, política de retenção definida.

**Escopo redefinido pela v2.0.** O portal **não** faz autoinscrição automática. Ele permite:

- preencher a própria anamnese (inclusive o complemento incremental);
- consultar histórico de participação e comprovantes;
- **solicitar** inscrição em evento.

A solicitação entra como pendência para o Acolhimento, que conversa, avalia e confirma. **A recepção continua humana** (§5.5). O ganho é retirar a digitação da anamnese da coordenação, que é o trabalho manual real — não eliminar a conversa, que é o valor.

#### Fase 7 — Captura assistida

PWA offline, ponte de importação de texto, WhatsApp para alimentação do Financeiro se viável (§5.5).

> **Nota de posicionamento.** O WhatsApp está aqui, na captura assistida, como estava na v1.1. Se a intenção for antecipá-lo para logo após o Financeiro, é uma troca de posição no roadmap sem qualquer impacto no modelo de domínio — o canal desemboca no mesmo `Lancamento` em `RASCUNHO`. Vale só lembrar que a fila de conferência (Fase 1) e a conciliação (Fase 2) precisam existir antes, senão o WhatsApp entrega dado em um lugar que ninguém revisa.

#### Fase 8 — Parametrização e inteligência (contínuo)

CRUD administrativo de categorias, papéis, contas e **grupos de acesso configuráveis** (Doc 3 §9); `Apoio` como agregado (§9.3); dashboards; projeções orçamentárias.

### 9.3 O que ficou de fora da v1, e por quê

| Item | Motivo | Dívida estrutural |
|---|---|---|
| **`Apoio` recorrente** | Não é a dor imediata | **Nenhuma.** Na v1, um apoio é apenas um `Lancamento` com `pessoaId` preenchido e categoria própria. O agregado, quando vier, lê o histórico e não quebra nada. |
| **Notificações** | Decisão de produto (§5.4) | Nenhuma. Os eventos de domínio existem; falta só um assinante. |
| **Programa LGPD completo** | Prioridade é adoção (§5.6) | **Declarada.** Bloqueia a Fase 6. |
| **Grupos configuráveis** | Seis grupos fixos bastam | **Nenhuma**, desde que as permissões sejam códigos desde o início (Doc 3 §9). |
| **Chatbot com IA** | Substituído pela importação de OFX, mais barata e confiável | Nenhuma. |

### 9.4 Sequenciamento — observações

- **Financeiro antes de Pessoas.** Maior dor, modelo mais maduro, e produz o marco de confiança que sustenta politicamente o resto. Pessoas na v1 pode ser cadastro mínimo (nome, tipo, documento, papel), suficiente para os lançamentos referenciarem fornecedores.
- **Conciliação logo depois do Financeiro.** É o que transforma "sistema onde a gente digita" em "sistema que sabe mais que a gente".
- **Anamnese junto com Pessoas**, porque é pré-requisito de Eventos.
- **Portal por último**, porque expõe o sistema a usuários externos e exige a conformidade concluída.
- **Captura assistida depois do básico funcionar.** Automatizar a entrada antes de o fluxo manual estar bom é otimizar o caminho errado.

---

## 10. Riscos e decisões

### 10.1 Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Sistema mais trabalhoso que o WhatsApp** | Crítico — abandono | UX mobile-first obsessiva; importação de OFX reduzindo digitação; envolver a tesouraria desde o protótipo |
| Projeto tocado por voluntários, sem dedicação integral | Alto — paralisação | Fases curtas com valor entregue; evitar dependências exóticas; ADRs |
| Vazamento de dado sensível (saúde/religião) | Crítico — jurídico e de confiança | Controle de acesso e log desde a v1; programa completo antes da Fase 6 |
| **Programa LGPD adiado ser esquecido** | Alto | Registrado como pré-requisito bloqueante da Fase 6 e como dívida em §5.6 |
| Vazamento cross-tenant | Crítico | RLS no banco, não só filtro na aplicação; teste de integração específico |
| Migração introduzir erro no histórico | Alto | Operação paralela com conciliação; histórico carregado somente leitura |
| **Acolhimento enxergar dado financeiro indevido** | Alto — confiança interna | Read models separados por natureza (Doc 2 §5.3); teste de autorização por grupo (Doc 3 §11) |
| Design-first produzir interface que viola invariantes | Médio-alto | Docs 2 e 3 como guarda-corpo; protótipo desenhado por grupo de acesso |
| **Fila de trabalho não ser consultada** (sem notificação, ninguém lembra) | Médio | Fila como tela inicial pós-login, com contagem visível; medir uso na Fase 1 e reavaliar |
| Formulário de anamnese versionado gerar pendência em massa | Médio | Distinguir correção cosmética de substituição na tela de edição; mostrar impacto antes de publicar |
| WhatsApp inviável e a captura continuar penosa | Médio | Importação de OFX já resolve a maior parte, independentemente do WhatsApp |
| Modelagem excessiva ("DDD por DDD") | Médio | Padrões táticos onde há regra real; CRUD simples onde não há |

### 10.2 Decisões tomadas

| # | Questão | Decisão | Onde |
|---|---|---|---|
| 1 | Multi-entidade ou dimensão de unidade? | Multi-tenancy desde a fundação. `Instituicao` (tenant) ≠ `Unidade` (centro de custo) ≠ contraparte. | §4.2 |
| 2 | Regime de caixa ou competência? | **Competência.** `dataCompetencia` é o eixo dos relatórios; `dataCaixa` alimenta o fluxo de caixa. | Doc 2 §1.3 |
| 3 | Quem autoriza adiantamentos? | Somente padrinho ou madrinha, por **vínculo ativo** — invariante de domínio, não permissão de grupo. | Doc 3 §8 |
| 4 | Devolução de contribuição | 100% reembolsável quando o participante falta e solicita. Cancelamento gera devolução pendente; não devolve automaticamente. | Doc 2 §2.4 |
| 5 | Granularidade do consumo de daime | Volume total por cerimônia, discriminado por lote. Sem controle por participante ou dose. **Estimativa prévia por número de consagrantes; baixa de estoque só com o volume real confirmado.** | Doc 2 §4.5 |
| 6 | Caixinha Ayahuasca: conta ou fundo? | Fundo com destinação vinculada. | Doc 2 §1.9 |
| 7 | **`Pessoa` e `Usuario`** | Agregados separados. Papel de domínio e perfil de acesso são eixos independentes. | Doc 3 §2 |
| 8 | **Grupos de acesso** | Seis grupos pré-definidos na v1; permissões declaradas como códigos; grupos configuráveis depois, sem refactor. | Doc 3 §5, §9 |
| 9 | **Fronteira do Acolhimento** | Opera eventos, inscrições, anamneses, pessoas, leitos, refeições, consumo real de daime e **marcação de pagamento**. Não acessa movimentação financeira fora do evento nem saídas financeiras do evento. | Doc 3 §7 |
| 10 | **Regime da unidade** | `CONTRIBUICAO` \| `COMERCIAL`. Lojinha e Munay são comerciais. | §4.3 |
| 11 | **Munay: tenant ou unidade?** | **Unidade de regime comercial.** Não é tenant. | §4.3 |
| 12 | **Regime de receita do evento** | `CONTRIBUICAO` \| `CONTRATADO` \| `INTERNO`, com invariantes distintas. | Doc 2 §2.2 |
| 13 | **Pessoa jurídica** | `Pessoa` admite `FISICA` e `JURIDICA`, com CPF ou CNPJ. | Doc 2 §3.1 |
| 14 | **Notificações** | Não existem. Substituídas pela fila de trabalho. | §5.4 |
| 15 | **WhatsApp** | Se viável, só para alimentação do Financeiro. Recepção sempre humana. | §5.5 |
| 16 | **Captura financeira** | Importação de OFX/CSV promovida a estratégia principal; chatbot rebaixado. | §5.3 |
| 17 | **Prestação de contas** | Exportação sob demanda por governança e administração, com supressão de identidade no nível resumo. Sem DRE público. | §6 |
| 18 | **`Apoio`** | Adiado para depois da v1, sem dívida estrutural. | §9.3 |
| 19 | **LGPD** | Itens baratos na v1; programa completo como pré-requisito bloqueante da Fase 6. | §5.6 |
| 20 | **Read models de evento** | Arrecadação em Eventos; resultado e ponto de equilíbrio em Financeiro. | Doc 2 §5.3 |
| 21 | **Escala de equipe** | **Fora de escopo.** Os guardiões revezam funções dentro do mesmo trabalho; a presença fica registrada pela inscrição do tipo `EQUIPE`. | Doc 2 §2.8 |
| 22 | **Consumo de daime** | Estimativa prévia por consagrantes, para planejamento; registro real por Acolhimento ou Administrador, que é o único a movimentar estoque. | Doc 2 §4.5 |
| 23 | **Criação de eventos** | Atribuição do Acolhimento no CDD. Pode variar em outra instituição — resolvido pelo seed de grupos por tenant. | Doc 3 §9 |
| 24 | **Tesouraria e marcação de pagamento** | Mantida a permissão. Não é necessária ao fluxo, mas é conveniente. | Doc 3 §6.2 |
| 25 | **Acesso da governança** | Padrinho e madrinha terão login. Autorização de adiantamento segue o fluxo de dois eixos, sem rota alternativa. | Doc 3 §8.1 |

### 10.3 Questões ainda em aberto

| # | Questão | Quem decide | Bloqueia |
|---|---|---|---|
| 1 | Regime da Chácara e dos Dormitórios — há receita comercial fora de trabalho? | Coordenação | Seed de unidades (Fase 1) |
| 2 | Quais unidades emitem nota fiscal e sob qual CNPJ | Contabilidade | Nada na v1; necessário antes de operar receita comercial |
| 3 | Prazo máximo para ressarcimento de adiantamento e valor que dispensa autorização prévia | Governança | Read model de reembolsos (Fase 1) |
| 4 | Validade da anamnese em meses (sugestão inicial: 12) | Coordenação | Fase 3 |
| 5 | Política de retenção de dado sensível | Coordenação | Fase 6 |
| 6 | Termo de consentimento LGPD — redação e base legal | Coordenação | Fase 6 |
| 7 | Viabilidade atual da API do WhatsApp para recepção de mensagens | Verificação técnica | Fase 7 |
| 8 | Consumo médio de daime por consagrante, para calibrar a estimativa inicial | Coordenação | Fase 5 |
| 9 | Capacidade real de leitos por dormitório | Coordenação | Fase 4 |
| 10 | A equipe consagra mas não faz anamnese — é intencional? Ver Doc 2, invariante IN3 | Coordenação | Fase 4 |

Nenhuma delas tem impacto arquitetural. A única com esse peso — Munay como tenant ou unidade — foi resolvida (§4.3).

---

## 11. Próximos passos

1. **Validar este conjunto documental** com coordenação e tesouraria, em especial o glossário (§2), a fronteira do Acolhimento (Doc 3 §7) e as questões abertas (§10.3).
2. **Confirmar o regime de Chácara e Dormitórios** e a situação fiscal das unidades comerciais com a contabilidade.
3. **Iniciar o design do Financeiro** — lançamento rápido e fila de conferência primeiro, por definirem a adoção. Validar os 30 segundos com quem hoje lança pelo WhatsApp.
4. **Sessão de Event Storming** com tesouraria e acolhimento, em paralelo ao design. As planilhas mostram o *quê*; o event storming revela o *porquê* e os casos-limite que ninguém documentou.
5. **Escrever as primeiras ADRs**: monólito modular, multi-tenancy com RLS, `Pessoa` × `Usuario`, permissões como códigos, ausência de notificações, importação de OFX antes de chatbot.
6. **Montar o monorepo com `packages/contracts`** desde o primeiro commit.
7. **Levantar a capacidade real de leitos** e o consumo médio de daime por consagrante — dados de campo que ninguém tem escrito e que as Fases 4 e 5 vão exigir.

---

## Anexo A — Regras de negócio extraídas do uso real

Regras observadas nas planilhas e no fluxo de mensagens, que o modelo precisa acomodar.

1. Cerimônias ocorrem cerca de 1×/mês, ocasionalmente 2× — a identidade exige nome **e** data.
2. Eventos ocorrem em locais distintos (sede, Chácara, Instituto Terra em São Roque/SP).
3. Contribuições variam por participante (R$ 100 a R$ 229), com isenção para equipe e crianças.
4. Hospedagem é adicional cobrado à parte (beliche R$ 50), com contagem de dias.
5. Refeições são controladas individualmente (ceia, café, almoço, domingo).
6. Equipe/staff participa sem contribuir financeiramente.
7. Apenas músicos da Munay recebem cachê. Guardião e cuidadora são funções voluntárias. Fora os músicos, só prestadores de serviço são remunerados.
8. Menores — "crianças estelares" — podem participar da cerimônia com autorização dos responsáveis, ou permanecer nas dependências sob supervisão da cuidadora.
9. Despesas são adiantadas por pessoas físicas e ressarcidas depois; só padrinho e madrinha autorizam.
10. Lançamentos chegam com atraso e com a data real entre parênteses no texto — evidência de que o regime pretendido é competência.
11. Uma mensagem pode conter mais de um item ("65+70 recarga extintor e suporte").
12. Existem estornos e correções de lançamentos anteriores.
13. Daime provém de produção própria (feitio) e de aquisição externa (Céu Sagrado, Acre).
14. Uma cerimônia pode servir mais de um lote de daime; o consumo é medido por volume total, por lote.
15. O feitio é evento, processo produtivo e centro de custo simultaneamente.
16. A Lojinha vende produtos (camisetas) com investimento e receita próprios — **é unidade de regime comercial**.
17. **A Munay conduz cerimônias e apresentações contratadas por outras instituições, mediante cachê recebido.** Tem operação econômica parcialmente autônoma, compartilha infraestrutura e possui MEI próprio — **é unidade de regime comercial**.
18. Existem empréstimos entre o centro e pessoas físicas, em ambas as direções.
19. Contribuições podem ser ressarcidas por terceiros ("quem comprou irá reembolsar").
20. Há repasses de contribuição entre unidades.
21. A Caixinha Ayahuasca é fundo com destinação vinculada ao sacramento.
22. Não existe vínculo societário com o CDD. "Inv. sócios na Chácara" refere-se à propriedade da terra e está fora do escopo.
23. **A pessoa que acolhe é quem analisa a anamnese e conversa com quem vem pela primeira vez** — é uma função só, e ela não tem nada a ver com o caixa.
24. **Fornecedores e contratantes podem ser pessoa jurídica.**
25. **A recepção de participantes é sempre humana** — nenhum canal automatizado se interpõe.
26. **Os guardiões são poucos e revezam funções dentro da mesma cerimônia.** Não há escala nominal por função e turno; há equipe presente. *(v2.1)*
27. **A equipe consagra**, e por isso conta para o consumo de daime, ainda que não preencha anamnese. *(v2.1)*
28. **O volume de daime servido só é conhecido depois do trabalho.** A estimativa prévia serve para saber se há sacramento suficiente; não substitui o registro real. *(v2.1)*

---

*Documento gerado a partir da análise das planilhas "DRE - Agrupamento e Fluxo de Caixa Munay 2025.xlsx", "Financeiro CDD 2026" (Google Sheets) e do histórico de lançamentos do grupo "Tesouro CDD e Munay" (jan–jul/2026), consolidado com as decisões de projeto de agosto/2026.*
