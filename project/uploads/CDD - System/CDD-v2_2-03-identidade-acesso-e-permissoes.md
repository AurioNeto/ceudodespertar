# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 3 de 4 — Identidade, Acesso e Permissões

**Versão 2.2** · Autor: Aurio Neto · Data: agosto/2026 · Status: consolidado

> Pressupõe a leitura do **Documento 1 — Arquitetura e Estratégia** e do **Documento 2 — Modelo de Domínio**.
> As telas correspondentes estão no **Documento 4 — Mapa de Telas e Navegação**.
> Este é o documento mais operacional dos quatro: é ele que a coordenação consegue validar linha a linha, sem entender de arquitetura.

### Mudanças da v2.1 → v2.2

| # | Alteração | Seções | Origem |
|---|---|---|---|
| 1 | Nova permissão **`financeiro.lancamento.ler_proprios`** | §4.1, §5.1, §6.1, §10.4, §11.2 | Doc 4, decisão Q1 |
| 2 | Redação: `RASCUNHO` → **`A_CONFERIR`** nas descrições de permissão | §4.1, §5, §11.2 | Doc 4, decisão Q2 (Doc 2 §1.3) |

**Por que a permissão nova.** O `REGISTRO` tinha `lancamento.registrar` e nenhuma forma de ver o que registrou. Isso parecia rigor e era um buraco: a conferência encontra lançamentos sem categoria, e **só quem gastou sabe para que foi**. Sem caminho de volta, a pergunta sai do sistema e vai para o WhatsApp — o retrabalho que o projeto existe para eliminar. Conceder `lancamento.ler` resolveria o buraco abrindo o caixa inteiro a quem registrou uma recarga de extintor. `ler_proprios` é a resposta estreita: **apenas o que este usuário registrou, e sem nenhuma agregação**.

---

## 1. O problema que este documento resolve

A v1.1 tinha um único enum `Papel` misturando duas coisas de naturezas diferentes:

- `GUARDIAO`, `PARTICIPANTE`, `MUSICO`, `APOIADOR` — vínculos com a comunidade. Descrevem o que a pessoa **é**.
- `ADMINISTRADOR`, `TESOURARIA`, `COORDENACAO` — perfis de acesso. Descrevem o que o usuário **pode fazer**.

A confusão não é acadêmica. Ela quebra em casos reais:

- A **madrinha é liderança espiritual** mesmo que nunca abra o sistema. Seu papel não é uma permissão.
- A **tesoureira pode não ter papel ritual nenhum**. Seu acesso não é um papel de domínio.
- A maioria das pessoas cadastradas — participantes, fornecedores, contratantes — **nunca terá login**.
- E o caso que quebra de vez: a v1.1 exigia papel `PADRINHO`/`MADRINHA` para autorizar adiantamento. Um papel de domínio usado como permissão. Funciona hoje porque há um tenant só e todo mundo se conhece; deixa de funcionar assim que grupos virarem cadastráveis, porque um administrador poderia conceder autoridade espiritual pela tela de acesso.

**A separação:**

```
┌────────────────────────────┐         ┌────────────────────────────┐
│          PESSOA            │         │          USUÁRIO           │
│  (contexto Pessoas)        │ 1 ──▸ 0..1 │  (contexto Identidade)  │
│                            │         │                            │
│  Papéis de domínio         │         │  Grupos de acesso          │
│  MADRINHA, GUARDIAO,       │         │  ADMINISTRADOR,            │
│  MUSICO, PARTICIPANTE...   │         │  TESOURARIA, ACOLHIMENTO...│
│                            │         │                            │
│  O que a pessoa É          │         │  O que o usuário PODE      │
└────────────────────────────┘         └────────────────────────────┘
```

Duas verificações independentes, que às vezes se combinam (§8).

---

## 2. `Usuario` (raiz de agregado)

Módulo `identidade`, schema `identidade`.

```typescript
class Usuario {
  readonly id: UsuarioId;
  readonly pessoaId: PessoaId;                 // todo usuário é uma pessoa
  readonly subjectId: string;                  // 'sub' do Keycloak
  private grupos: GrupoId[];
  private ativo: boolean;
  private ultimoAcessoEm: DateTime | null;

  get permissoes(): Set<Permissao>             // união das permissões dos grupos
  pode(permissao: Permissao): boolean
  adicionarAGrupo(grupoId: GrupoId, por: UsuarioId): Result<void, DomainError>
  removerDeGrupo(grupoId: GrupoId, por: UsuarioId): Result<void, DomainError>
  desativar(por: UsuarioId, motivo: string): void
}
```

**Invariantes**

| # | Regra |
|---|---|
| US1 | Todo `Usuario` referencia uma `Pessoa` existente e ativa. Não existe usuário sem pessoa. |
| US2 | Uma `Pessoa` tem no máximo um `Usuario` por instituição. |
| US3 | Usuário sem grupo não tem permissão alguma — ausência de grupo não significa acesso total. |
| US4 | Usuário inativo não autentica. O histórico de suas ações permanece. |
| US5 | Não é possível remover o próprio acesso de administração se for o último administrador ativo da instituição. |
| US6 | Toda mudança de grupo registra autor e timestamp. |

**Por que `Usuario` é modelo próprio e não só configuração do Keycloak:** o Keycloak resolve autenticação — quem é você, com que senha, com que segundo fator. A **autorização** aqui é regra de negócio do centro (§7), muda com o domínio e precisa ser testável junto com os agregados. Mantê-la no sistema evita que uma regra de negócio viva num arquivo de configuração de infraestrutura que ninguém revisa.

---

## 3. `Grupo` (raiz de agregado)

```typescript
class Grupo {
  readonly id: GrupoId;
  readonly codigoSistema: string;              // 'ACOLHIMENTO' — imutável
  private nome: string;                        // rótulo editável
  private descricao: string;
  private permissoes: Permissao[];
  readonly protegido: boolean;                 // grupos de seed não são excluíveis
  private ativo: boolean;

  concederPermissao(p: Permissao, por: UsuarioId): Result<void, DomainError>
  revogarPermissao(p: Permissao, por: UsuarioId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| G1 | `codigoSistema` é imutável e único. Regras que referenciam grupo usam o código, nunca o nome. |
| G2 | Grupo `protegido` não pode ser excluído nem ter o `codigoSistema` alterado. Todos os seis grupos de seed são protegidos. |
| G3 | Grupo com usuário ativo não pode ser excluído. |
| G4 | Só se concede permissão que exista no catálogo (§4). Permissão inventada é erro de domínio. |
| G5 | Alterar permissões de grupo protegido é permitido — o que é protegido é a existência, não o conteúdo. |

---

## 4. Catálogo de permissões

A permissão é o **vocabulário da autorização**. É catálogo fixo em código, não cadastro: nomes de permissão são parte do modelo, como nomes de método.

Formato: `modulo.recurso.acao`.

### 4.1 Financeiro

| Permissão | O que habilita |
|---|---|
| `financeiro.lancamento.registrar` | Criar lançamento em `A_CONFERIR` |
| `financeiro.lancamento.confirmar` | Confirmar lançamento `A_CONFERIR`; ver a fila de conferência; **abrir pendência** endereçada a quem registrou |
| `financeiro.lancamento.estornar` | Estornar lançamento confirmado |
| `financeiro.lancamento.ler` | Ver lançamentos, com valores e contas |
| `financeiro.lancamento.ler_proprios` | **Ver e responder apenas os lançamentos que o próprio usuário registrou.** Sem contas, sem saldos, sem agregação |
| `financeiro.transferencia.registrar` | Registrar transferência entre contas |
| `financeiro.conta.ler` | Ver contas e saldos |
| `financeiro.conta.gerenciar` | Criar e editar contas |
| `financeiro.fatura.gerenciar` | Fechar e registrar pagamento de fatura |
| `financeiro.emprestimo.gerenciar` | Registrar empréstimo e devolução |
| `financeiro.adiantamento.registrar` | Registrar adiantamento (sujeito a A1 — §8) |
| `financeiro.adiantamento.autorizar` | Autorizar adiantamento (sujeito a A1 — §8) |
| `financeiro.adiantamento.ressarcir` | Efetivar ressarcimento |
| `financeiro.fundo.gerenciar` | Aportar e aplicar no fundo |
| `financeiro.periodo.fechar` | Fechar competência |
| `financeiro.periodo.reabrir` | Reabrir competência fechada |
| `financeiro.plano_contas.ler` | Ver categorias e unidades |
| `financeiro.plano_contas.gerenciar` | Criar e editar categorias, unidades, regimes |
| `financeiro.dre.ler` | Ver DRE, faturamento por unidade, resultado por fornecedor |
| `financeiro.fluxo_caixa.ler` | Ver fluxo de caixa e extratos |
| `financeiro.resultado_evento.ler` | **Ver custos, resultado e ponto de equilíbrio do evento** |
| `financeiro.reembolsos.ler` | Ver reembolsos pendentes |
| `financeiro.importacao.executar` | Importar OFX/CSV |
| `financeiro.conciliacao.executar` | Conciliar extrato com lançamentos |
| `financeiro.prestacao_contas.gerar` | Gerar prestação de contas nível `RESUMO` |
| `financeiro.prestacao_contas.detalhada` | Gerar prestação nível `DETALHADO`, com nomes |

### 4.2 Eventos

| Permissão | O que habilita |
|---|---|
| `eventos.evento.criar` | Criar evento |
| `eventos.evento.editar` | Editar evento planejado |
| `eventos.evento.cancelar` | Cancelar evento |
| `eventos.evento.realizar` | Marcar evento como realizado |
| `eventos.inscricoes.abrir` | Abrir e encerrar inscrições |
| `eventos.inscricao.registrar` | Inscrever pessoa em evento |
| `eventos.inscricao.editar` | Alterar inscrição (hospedagem, refeições, tipo) |
| `eventos.inscricao.confirmar` | Confirmar inscrição |
| `eventos.inscricao.cancelar` | Cancelar inscrição |
| `eventos.inscricao.ler` | Ver lista de participantes e pendências |
| `eventos.pagamento.registrar` | **Marcar que a pessoa X pagou no evento Y** |
| `eventos.arrecadacao.ler` | Ver total arrecadado e pendências de pagamento do evento |
| `eventos.devolucao.solicitar` | Registrar solicitação de devolução |
| `eventos.devolucao.efetivar` | **Pagar a devolução** |
| `eventos.operacao.ler` | Ver leitos, refeições e consumo estimado |
| `eventos.operacao.gerenciar` | Alocar leitos e definir refeições |
| `eventos.contratacao.gerenciar` | Criar e gerir contratação (evento `CONTRATADO`) |
| `eventos.acolhimento.registrar` | Registrar que a conversa de primeira vez ocorreu |

### 4.3 Pessoas

| Permissão | O que habilita |
|---|---|
| `pessoas.pessoa.registrar` | Cadastrar pessoa física ou jurídica |
| `pessoas.pessoa.editar` | Editar cadastro |
| `pessoas.pessoa.ler` | Ver diretório e ficha (sem dado de saúde) |
| `pessoas.vinculo.gerenciar` | Atribuir e encerrar papéis de domínio |
| `pessoas.anamnese.ler` | **Ler respostas de anamnese** (gera registro de acesso) |
| `pessoas.anamnese.analisar` | Ver alertas e registrar parecer |
| `pessoas.anamnese.responder_por_terceiro` | Digitar a anamnese de alguém (fluxo presencial) |
| `pessoas.formulario.editar` | Editar formulário de anamnese em rascunho |
| `pessoas.formulario.publicar` | Publicar nova versão do formulário |
| `pessoas.autorizacao_responsavel.registrar` | Registrar autorização de menor |
| `pessoas.consentimento.registrar` | Registrar ou revogar consentimento |
| `pessoas.pessoa.anonimizar` | Executar anonimização (direito de eliminação) |

### 4.4 Estoque

| Permissão | O que habilita |
|---|---|
| `estoque.item.gerenciar` | Cadastrar itens e lotes |
| `estoque.movimento.registrar` | Registrar entrada, saída, ajuste |
| `estoque.consumo.registrar` | Registrar o consumo **real** de cerimônia, por lote |
| `estoque.feitio.gerenciar` | Gerir feitio e concluir produção |
| `estoque.saldo.ler` | Ver saldos e lotes |

### 4.5 Sistema

| Permissão | O que habilita |
|---|---|
| `sistema.usuario.gerenciar` | Criar usuário, associar a grupos, desativar |
| `sistema.grupo.gerenciar` | Criar e editar grupos de acesso (fase de parametrização) |
| `sistema.parametro.gerenciar` | Editar parâmetros da instituição e das unidades |
| `sistema.auditoria.ler` | Ver trilha de auditoria e log de acesso a dado sensível |

---

## 5. Grupos de acesso da v1

Seis grupos, criados por seed em migration (Doc 1 §4.8). Todos `protegido = true`.

| Código | Nome | Quem é, na prática |
|---|---|---|
| `ADMINISTRADOR` | Administrador | Quem mantém o sistema. Acesso pleno, incluindo gestão de usuários. |
| `GOVERNANCA` | Governança | Padrinho e madrinha. Visão consolidada, prestação de contas, autorização de adiantamento. Não opera o dia a dia. |
| `TESOURARIA` | Tesouraria | Quem cuida do dinheiro. Registra, confirma, estorna, concilia, fecha período. |
| `ACOLHIMENTO` | Acolhimento e Organização | Quem recebe, inscreve, analisa anamnese, conversa com quem vem pela primeira vez e **organiza o evento**. **Sem acesso a movimentação financeira.** |
| `REGISTRO` | Registro rápido | Quem gasta e precisa registrar. Cria lançamento `A_CONFERIR`, anexa comprovante e responde pendências sobre os próprios registros. **Não confirma.** |
| `LEITURA` | Leitura | Consulta a painéis consolidados, sem escrita e sem dado sensível. |

### 5.1 Por que `REGISTRO` existe

Não é enfeite: é a materialização da estratégia de captura #2 (Doc 1 §5.3). Quem gasta registra rápido e **não deveria ter poder de confirmar o próprio lançamento**. Separar `registrar` de `confirmar` é o que transforma a fila de conferência em controle de verdade, e não em etapa opcional que se pula quando há pressa.

Na prática, várias pessoas que hoje mandam mensagem no grupo receberiam este grupo, e só ele.

**O que a v2.2 corrigiu.** Separar `registrar` de `confirmar` estava certo; negar qualquer leitura estava errado. Quem registra precisa saber se o lançamento passou e, sobretudo, **precisa poder responder quando a conferência pergunta** — porque a informação que falta é quase sempre a que só ele tem: de qual cerimônia foi a compra, o que eram os R$ 65 do valor composto, qual a data real do gasto. Negar isso não protegia nada e empurrava a conversa de volta para o WhatsApp.

`financeiro.lancamento.ler_proprios` é deliberadamente estreita, e a estreiteza está na **ausência de agregação**: sem totais, sem somas, sem filtro por período. É a lista dos fatos que eu mesmo afirmei, não um demonstrativo. Sem essa restrição, a permissão viraria um DRE pobre por acumulação — e a fronteira que o grupo existe para expressar se dissolveria sem que ninguém percebesse.

Efeito lateral que interessa à adoção: com ela, `REGISTRO` deixa de ser um menu com um botão só e passa a ter motivo para o usuário voltar ao sistema.

### 5.2 Por que `GOVERNANCA` existe

Padrinho e madrinha precisam de login por dois motivos concretos: **autorizar adiantamento** (§8) e **gerar prestação de contas** (Doc 1 §6). Não precisam — e provavelmente não querem — operar lançamento.

Dar-lhes `ADMINISTRADOR` seria mais simples e é exatamente o erro a evitar: acesso concedido por conveniência acaba sendo acesso que ninguém revisa.

### 5.3 Por que `LEITURA` é restrito

`LEITURA` **não** é "vê tudo mas não edita". Vê **painéis consolidados**: DRE, fluxo de caixa, saldos. Não vê anamnese, não vê ficha de pessoa, não vê lista nominal de participantes.

O motivo é o alerta do Doc 1 §5.6: a lista de participantes de uma cerimônia é, por si só, dado sensível — revela filiação religiosa. Um grupo genérico de leitura que enxergasse participantes seria a porta mais provável de vazamento, justamente por parecer inofensivo.

### 5.4 Seis grupos para seis usuários — é demais? (v2.1)

A largada prevê **cerca de seis logins**. Seis grupos para seis pessoas parece desenho grande demais para o problema. Vale enfrentar a objeção.

**Distribuição provável na largada:**

| Grupo | Usuários previstos |
|---|---|
| `ADMINISTRADOR` | 1–2 |
| `GOVERNANCA` | 2 (padrinho e madrinha) |
| `TESOURARIA` | 1–2 |
| `ACOLHIMENTO` | 1–2 |
| `REGISTRO` | 0 na largada |
| `LEITURA` | 0 na largada |

Uma mesma pessoa pode estar em mais de um grupo — a tesoureira que também acolhe recebe os dois, e é exatamente para isso que grupos são conjuntos e não categorias.

**Por que manter os dois grupos vazios:**

1. **Custam uma entrada num array de seed.** Não há tabela extra, tela extra nem manutenção.
2. **Os testes de autorização os cobrem independentemente de haver usuários** (§11.2 já testa `REGISTRO`). Grupo criado depois, sob pressa, nasce sem teste.
3. **`REGISTRO` é o destino natural do crescimento.** Assim que mais alguém precisar registrar despesa — e esse é o objetivo declarado da captura mobile —, o grupo já existe, testado e com fronteira pensada. O contrário seria conceder `TESOURARIA` "só por enquanto".

**O risco real com seis pessoas não é grupo demais — é acesso demais.** Em equipe pequena, onde todos se conhecem e confiam, a tentação de dar `ADMINISTRADOR` a todo mundo "para não travar" é alta, e ela anula o desenho inteiro deste documento. A mitigação não é técnica: é ter a matriz escrita, revisá-la de tempos em tempos e tratar concessão de acesso pleno como exceção que se justifica, não como atalho.

---

## 6. Matriz de permissões

Legenda: **●** concedida · **○** não concedida · **⊗** concedida com invariante adicional de domínio (§8)

### 6.1 Financeiro

| Permissão | ADMIN | GOVERN | TESOUR | ACOLH | REGIS | LEIT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `lancamento.registrar` | ● | ○ | ● | ○ | ● | ○ |
| `lancamento.confirmar` | ● | ○ | ● | ○ | ○ | ○ |
| `lancamento.estornar` | ● | ○ | ● | ○ | ○ | ○ |
| `lancamento.ler` | ● | ● | ● | ○ | ○ | ○ |
| `lancamento.ler_proprios` | ● | ○ | ● | ○ | **●** | ○ |
| `transferencia.registrar` | ● | ○ | ● | ○ | ○ | ○ |
| `conta.ler` | ● | ● | ● | ○ | ○ | ○ |
| `conta.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `fatura.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `emprestimo.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `adiantamento.registrar` | ● | ○ | ● | ○ | ○ | ○ |
| `adiantamento.autorizar` | ⊗ | ⊗ | ○ | ○ | ○ | ○ |
| `adiantamento.ressarcir` | ● | ○ | ● | ○ | ○ | ○ |
| `fundo.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `periodo.fechar` | ● | ○ | ● | ○ | ○ | ○ |
| `periodo.reabrir` | ● | ○ | ○ | ○ | ○ | ○ |
| `plano_contas.ler` | ● | ● | ● | ○ | ● | ● |
| `plano_contas.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `dre.ler` | ● | ● | ● | ○ | ○ | ● |
| `fluxo_caixa.ler` | ● | ● | ● | ○ | ○ | ● |
| `resultado_evento.ler` | ● | ● | ● | **○** | ○ | ● |
| `reembolsos.ler` | ● | ● | ● | ○ | ○ | ○ |
| `importacao.executar` | ● | ○ | ● | ○ | ○ | ○ |
| `conciliacao.executar` | ● | ○ | ● | ○ | ○ | ○ |
| `prestacao_contas.gerar` | ● | ● | ● | ○ | ○ | ○ |
| `prestacao_contas.detalhada` | ● | ● | ● | ○ | ○ | ○ |

> `periodo.reabrir` fica só com `ADMINISTRADOR`. Reabrir mês fechado é operação excepcional; exigir uma segunda pessoa é controle barato e adequado ao contexto de dinheiro de comunidade.

### 6.2 Eventos

| Permissão | ADMIN | GOVERN | TESOUR | ACOLH | REGIS | LEIT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `evento.criar` | ● | ○ | ○ | **●** | ○ | ○ |
| `evento.editar` | ● | ○ | ○ | **●** | ○ | ○ |
| `evento.cancelar` | ● | ○ | ○ | ● | ○ | ○ |
| `evento.realizar` | ● | ○ | ○ | ● | ○ | ○ |
| `inscricoes.abrir` | ● | ○ | ○ | ● | ○ | ○ |
| `inscricao.registrar` | ● | ○ | ○ | **●** | ○ | ○ |
| `inscricao.editar` | ● | ○ | ○ | ● | ○ | ○ |
| `inscricao.confirmar` | ● | ○ | ○ | ● | ○ | ○ |
| `inscricao.cancelar` | ● | ○ | ○ | ● | ○ | ○ |
| `inscricao.ler` | ● | ● | ● | ● | ○ | ○ |
| `pagamento.registrar` | ● | ○ | ● | **●** | ○ | ○ |
| `arrecadacao.ler` | ● | ● | ● | **●** | ○ | ○ |
| `devolucao.solicitar` | ● | ○ | ● | **●** | ○ | ○ |
| `devolucao.efetivar` | ● | ○ | ● | **○** | ○ | ○ |
| `operacao.ler` | ● | ● | ● | ● | ○ | ○ |
| `operacao.gerenciar` | ● | ○ | ○ | **●** | ○ | ○ |
| `contratacao.gerenciar` | ● | ● | ● | ○ | ○ | ○ |
| `acolhimento.registrar` | ● | ○ | ○ | ● | ○ | ○ |

> `contratacao.gerenciar` fica fora do Acolhimento: negociar cachê com outra instituição é ato comercial da Munay, não recepção de participante.

### 6.3 Pessoas

| Permissão | ADMIN | GOVERN | TESOUR | ACOLH | REGIS | LEIT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `pessoa.registrar` | ● | ○ | ● | **●** | ○ | ○ |
| `pessoa.editar` | ● | ○ | ● | ● | ○ | ○ |
| `pessoa.ler` | ● | ● | ● | ● | ○ | ○ |
| `vinculo.gerenciar` | ● | ● | ○ | ● | ○ | ○ |
| `anamnese.ler` | ● | ○ | ○ | **●** | ○ | ○ |
| `anamnese.analisar` | ● | ○ | ○ | **●** | ○ | ○ |
| `anamnese.responder_por_terceiro` | ● | ○ | ○ | ● | ○ | ○ |
| `formulario.editar` | ● | ○ | ○ | ● | ○ | ○ |
| `formulario.publicar` | ● | ○ | ○ | ● | ○ | ○ |
| `autorizacao_responsavel.registrar` | ● | ○ | ○ | ● | ○ | ○ |
| `consentimento.registrar` | ● | ○ | ○ | ● | ○ | ○ |
| `pessoa.anonimizar` | ● | ○ | ○ | ○ | ○ | ○ |

> **A Tesouraria cadastra pessoa** porque precisa registrar fornecedor no lançamento. Não lê anamnese.
> **A Governança não lê anamnese.** Liderança espiritual não implica acesso a dado de saúde; se um padrinho também exerce acolhimento, recebe os dois grupos — que é exatamente o que a separação de eixos permite expressar.

### 6.4 Estoque e Sistema

| Permissão | ADMIN | GOVERN | TESOUR | ACOLH | REGIS | LEIT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `estoque.item.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `estoque.movimento.registrar` | ● | ○ | ● | ○ | ● | ○ |
| `estoque.consumo.registrar` | ● | ○ | ○ | ● | ○ | ○ |
| `estoque.feitio.gerenciar` | ● | ○ | ● | ○ | ○ | ○ |
| `estoque.saldo.ler` | ● | ● | ● | ● | ○ | ● |
| `sistema.usuario.gerenciar` | ● | ○ | ○ | ○ | ○ | ○ |
| `sistema.grupo.gerenciar` | ● | ○ | ○ | ○ | ○ | ○ |
| `sistema.parametro.gerenciar` | ● | ○ | ○ | ○ | ○ | ○ |
| `sistema.auditoria.ler` | ● | ● | ○ | ○ | ○ | ○ |

> `estoque.consumo.registrar` no Acolhimento **e** no Administrador: quem está no trabalho é quem sabe quanto foi servido, e o administrador cobre a ausência. Registrar consumo é operação de evento, não de almoxarifado. A estimativa prévia não exige permissão de escrita — é projeção, visível por `eventos.operacao.ler`.

---

## 7. A fronteira do Acolhimento — detalhamento

Este é o grupo novo da v2.0 e o que mais precisa de validação com a coordenação.

### 7.1 O que o Acolhimento faz, na prática

Uma função só, exercida por uma ou duas pessoas:

1. Atende quem quer participar e **encaminha a inscrição**.
2. **Analisa a anamnese** e avalia os alertas.
3. **Conversa com quem vem pela primeira vez.**
4. **Cria o evento** e cadastra as pessoas nele.
5. **Marca o pagamento** da pessoa X no evento Y — incluindo dormitório, criança e alimentação.
6. Organiza a operação do evento: leitos e refeições.
7. **Registra o consumo real de daime** depois do trabalho, a partir da estimativa pré-preenchida.

### 7.2 O que o Acolhimento não acessa

| Não acessa | Por quê |
|---|---|
| Lançamentos financeiros fora do evento | Não é sua função; expõe o caixa inteiro |
| **Saídas financeiras do evento** — despesas, custos, devolução paga | A recepção não movimenta dinheiro para fora |
| Resultado e ponto de equilíbrio do evento | Compostos de custo (Doc 2 §5.3) |
| DRE, fluxo de caixa, contas, saldos | Domínio da tesouraria |
| Reembolsos, adiantamentos, empréstimos, fundo | Domínio da tesouraria |
| Prestação de contas | Domínio da governança e da tesouraria |
| Contratação da Munay | Ato comercial, não recepção |

### 7.3 O caso que exige explicação: marcar pagamento sem permissão financeira

Marcar que alguém pagou **gera um lançamento de receita** no Financeiro (Doc 2 §5.1.1). À primeira vista, parece que o Acolhimento tem poder financeiro pela porta dos fundos. Não tem, e a diferença é precisa:

| O que o Acolhimento faz | O que o Acolhimento **não** faz |
|---|---|
| Registra um **fato de domínio**: "fulano pagou a contribuição" | Compõe um lançamento |
| Informa valor, data e meio de pagamento | Escolhe conta, categoria, unidade ou competência |
| Vê o total arrecadado do evento | Vê qualquer despesa, saldo ou resultado |
| — | Edita ou estorna o lançamento gerado (Doc 2, invariante L8) |

O lançamento é **composto pelo sistema**, a partir da configuração do evento — que foi definida por quem tem permissão financeira. O Acolhimento fornece um fato; o sistema deriva a consequência.

**O controle correspondente não é a conferência humana** (não faria sentido: ninguém digitou nada para revisar) — **é a conciliação bancária**. Se o pagamento foi marcado no sistema mas não apareceu no extrato, a fila de conciliação denuncia (Doc 2 §1.11). Isso é controle melhor que revisão de digitação, porque compara contra uma fonte externa.

### 7.4 A simetria da devolução

Devolução é o espelho do pagamento, e é onde a fronteira fica mais visível:

| Ato | Quem faz | Permissão |
|---|---|---|
| Cancelar a inscrição e **registrar a solicitação** de devolução | Acolhimento | `eventos.devolucao.solicitar` |
| **Pagar** a devolução | Tesouraria | `eventos.devolucao.efetivar` |

O Acolhimento sabe que a pessoa faltou e pediu o dinheiro de volta — é quem conversou com ela. Quem tira o dinheiro da conta é a tesouraria. **É exatamente a restrição "sem acesso às saídas financeiras do evento", expressa como duas permissões em vez de uma.**

### 7.5 Sobre o acesso à anamnese

O Acolhimento é o único grupo não-administrador com `anamnese.ler` e `anamnese.analisar`. Isso é correto — é quem analisa — e é também o ponto de maior sensibilidade do sistema inteiro.

Medidas que entram desde a v1, por serem baratas agora e caras depois (Doc 1 §5.6):

- Toda leitura registra acesso (Doc 2, invariante RA3). Não há leitura silenciosa de dado de saúde.
- O log é legível por `ADMINISTRADOR` e `GOVERNANCA` via `sistema.auditoria.ler`.
- Perguntas marcadas `sensivel` ficam prontas para criptografia em coluna quando o programa de conformidade for executado.

O que **não** entra na v1: criptografia em coluna, expurgo automático, política de retenção. Dívida declarada, bloqueante da Fase 6 (Portal).

---

## 8. Invariantes de domínio que não são permissão

Algumas autorizações **não** são permissão de grupo. São invariantes verificadas no agregado, contra vínculo de domínio.

### 8.1 Autorização de adiantamento

```typescript
// dentro de Adiantamento.criar(...)
const autorizador = await pessoas.obter(usuarioAutorizador.pessoaId);

const temAutoridade =
  autorizador.temPapelAtivoEm('PADRINHO', dataDespesa) ||
  autorizador.temPapelAtivoEm('MADRINHA', dataDespesa);

if (!temAutoridade) {
  return err(new SemAutoridadeParaAutorizarAdiantamento());
}
```

**Dupla verificação:**

1. **Permissão** `financeiro.adiantamento.autorizar` — o usuário pode acessar a operação.
2. **Vínculo** `PADRINHO` ou `MADRINHA` ativo na data — a pessoa tem autoridade.

Por isso a matriz (§6.1) marca essa linha com **⊗**: `ADMINISTRADOR` tem a permissão, mas se o administrador não for padrinho nem madrinha, a operação falha no domínio.

**Por que a separação importa:** sem ela, um administrador poderia conceder autoridade espiritual pela tela de gestão de acesso. Com ela, autoridade espiritual só se concede no cadastro de pessoas, atribuindo o vínculo — que é onde ela realmente mora. Isso deixa de ser sutileza no dia em que os grupos virarem cadastráveis (§9).

### 8.2 Resumo das verificações de dois eixos

| Operação | Permissão do usuário | Vínculo exigido |
|---|---|---|
| Autorizar adiantamento | `financeiro.adiantamento.autorizar` | `PADRINHO` ou `MADRINHA` (do autorizador) |
| Registrar autorização de menor | `pessoas.autorizacao_responsavel.registrar` | Responsável maior de idade (do responsável) |

> **A v2.1 reduziu esta lista.** Com a escala fora de escopo (Doc 2 §2.8), sumiram quatro das seis verificações de dois eixos. Restam duas — mas o mecanismo continua necessário, e a que restou no Financeiro é a mais importante das seis: é a que impede que autoridade espiritual seja concedida pela tela de administração de acesso.

---

## 9. Evolução para grupos configuráveis

**Decisão:** a v1 opera com os seis grupos de seed. A criação de grupos pela interface entra na fase de parametrização (Doc 1 §9.2, Fase 8).

**O que faz essa migração ser um cadastro e não um refactor:**

1. **Permissões são códigos desde o primeiro dia.** O domínio verifica `usuario.pode('financeiro.periodo.fechar')`, nunca `usuario.grupo === 'TESOURARIA'`. Nenhuma regra de negócio conhece nome de grupo.
2. **`Grupo` já é agregado com lista de permissões**, não enum. A tela de criação de grupo monta um array — não toca em regra.
3. **Grupos de seed são `protegido`**, então a evolução acrescenta, não substitui.
4. **Autorizações de domínio ficam fora do alcance da tela** (§8). Nenhum grupo criado por administrador consegue conceder autoridade de padrinho.

**Regra permanente:** se em algum momento aparecer no código uma comparação com nome de grupo, é bug. A verificação é sempre por permissão.

**Sobre outras casas (v2.1).** A distribuição de permissões deste documento é a do CDD — em outro centro, criar evento pode ser da coordenação e não do acolhimento. Isso **já está resolvido pela estrutura**, sem esperar a fase de parametrização: `Grupo` é agregado com `instituicaoId`, e o seed roda por instituição. Duas casas podem ter o grupo `ACOLHIMENTO` com conjuntos de permissões diferentes desde o primeiro dia, porque o que o código conhece é a permissão, não a composição do grupo. O CRUD de grupos apenas transfere essa edição da migration para a tela.

**O que a fase de parametrização acrescenta:**

- CRUD de grupos, montando conjuntos de permissões.
- Tela de "quem tem acesso a quê", listando usuários por permissão — mais útil que listar por grupo, na hora de revisar.
- Revisão periódica de acessos: relatório de usuários sem acesso há N meses.

---

## 10. Implementação

### 10.1 Autenticação × autorização

| Responsabilidade | Onde vive |
|---|---|
| Login, senha, MFA, recuperação, sessão | **Keycloak** |
| Identidade externa (`subjectId`) | Keycloak, referenciada em `Usuario` |
| Grupos, permissões, matriz | **Domínio do sistema** (módulo `identidade`) |
| Verificação em cada operação | Camada de aplicação (guard) + agregado (invariantes de §8) |

O Keycloak **não** carrega as permissões no token. O token identifica quem é; o sistema resolve o que pode. Isso evita ter que reemitir token quando um grupo muda, e mantém a autorização testável junto com o domínio.

### 10.2 Ponto de verificação

```typescript
@RequerPermissao('financeiro.periodo.fechar')
@Post('periodos/:competencia/fechar')
async fechar(@Param() params, @UsuarioAtual() usuario: UsuarioContexto) { ... }
```

**Duas camadas, sempre:**

1. **Guard na camada de aplicação** — barra a operação e devolve 403.
2. **Invariante no agregado** — para as regras de §8, que dependem de estado de domínio e não podem viver num decorator.

**Read models** são filtrados na query, não na resposta. Um read model que o usuário não pode ver **não é consultado** — não se busca para depois esconder. Isso evita a classe de bug em que o dado vaza por um endpoint de exportação que esqueceu o filtro.

> **`ler_proprios` não é verificação de permissão — é filtro de consulta** (v2.2). O guard confirma que o usuário tem a permissão; quem restringe o conjunto é o read model, com `registradoPor = usuarioAtual` aplicado na consulta, não na serialização. Filtrar depois de buscar é como vazamento nasce: basta alguém adicionar um campo agregado ao DTO. Ver T16b.

### 10.3 Interação com multi-tenancy

Permissão e tenant são independentes e cumulativos:

- **RLS** garante que o usuário só enxerga dados da sua instituição (Doc 1 §4.2).
- **Permissão** garante que, dentro da instituição, ele só faz o que lhe cabe.

Um administrador da instituição A com permissão total continua sem enxergar dado da instituição B — a garantia é do banco, não da aplicação.

### 10.4 Auditoria

Toda operação de escrita registra `UsuarioId`, timestamp e o comando executado. Operações sensíveis registram também o alvo:

| Operação | Registro adicional |
|---|---|
| Leitura de anamnese | `RegistroDeAcesso` na própria resposta (Doc 2, RA3) |
| Reabertura de período | Motivo textual obrigatório |
| Estorno | Motivo textual obrigatório |
| Mudança de grupo de usuário | Grupo anterior, grupo novo, autor |
| Geração de prestação de contas | Período, nível, hash, autor |
| Anonimização de pessoa | Autor e base legal invocada |
| Abertura de pendência em lançamento | Texto, autor e destinatário (Doc 2, L10) |

---

## 11. Casos de teste de autorização

Testes obrigatórios na CI. Cada um corresponde a uma regra que, se quebrar, quebra silenciosamente.

### 11.1 Fronteira do Acolhimento

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | Acolhimento consulta o painel de arrecadação do evento | **Permitido** |
| T2 | Acolhimento consulta resultado/ponto de equilíbrio do evento | **403** |
| T3 | Acolhimento lista lançamentos do evento | **403** |
| T4 | Acolhimento marca pagamento de inscrição | **Permitido**; gera lançamento `INTEGRACAO_EVENTOS` |
| T5 | Acolhimento tenta editar o lançamento gerado em T4 | **Rejeitado pelo domínio** (L8) |
| T6 | Acolhimento tenta estornar o lançamento gerado em T4 | **403** |
| T7 | Acolhimento registra solicitação de devolução | **Permitido** |
| T8 | Acolhimento tenta efetivar devolução | **403** |
| T9 | Acolhimento consulta DRE | **403** |
| T10 | Acolhimento cria evento e inscreve pessoa | **Permitido** |
| T11 | Acolhimento lê anamnese | **Permitido**; gera `RegistroDeAcesso` |
| T12 | Acolhimento gerencia contratação da Munay | **403** |

### 11.2 Separação registrar × confirmar

| # | Cenário | Resultado esperado |
|---|---|---|
| T13 | `REGISTRO` cria lançamento `A_CONFERIR` | **Permitido** |
| T14 | `REGISTRO` tenta confirmar o próprio lançamento | **403** |
| T15 | `REGISTRO` consulta o DRE | **403** |
| T16 | Tesouraria confirma lançamento criado por `REGISTRO` | **Permitido** |
| T16a | `REGISTRO` lista os lançamentos que ele mesmo registrou | **Permitido** |
| T16b | `REGISTRO` tenta ler lançamento registrado por outro usuário | **404** — não 403: a existência do lançamento alheio não é informação a que ele tenha acesso |
| T16c | `REGISTRO` responde pendência aberta no próprio lançamento | **Permitido** |
| T16d | Tesouraria tenta responder pendência endereçada ao `REGISTRO` | **Rejeitado pelo domínio** (Doc 2, L11) |
| T16e | Resposta a pendência altera o `status` do lançamento | **Não deve ocorrer** (Doc 2, L10) |

### 11.3 Invariantes de dois eixos

| # | Cenário | Resultado esperado |
|---|---|---|
| T17 | Administrador **sem** vínculo de padrinho autoriza adiantamento | **Rejeitado pelo domínio** (A1) |
| T18 | Padrinho (grupo `GOVERNANCA`) autoriza adiantamento | **Permitido** |
| T19 | Padrinho com vínculo **encerrado** na data da despesa autoriza | **Rejeitado** (vínculo não vigente) |
| T20 | Estimativa de consumo altera saldo de estoque | **Nunca** — a projeção não movimenta (EC1) |
| T21 | Tesouraria tenta ler anamnese | **403** |
| T22 | Governança tenta ler anamnese | **403** |

### 11.4 Isolamento e integridade

| # | Cenário | Resultado esperado |
|---|---|---|
| T23 | Usuário da instituição A consulta dado da instituição B | **Vazio** (RLS), não 403 |
| T24 | Usuário sem grupo algum acessa qualquer endpoint | **403** (US3) |
| T25 | Remover o último administrador ativo | **Rejeitado** (US5) |
| T26 | Usuário desativado tenta autenticar | **Rejeitado** |
| T27 | `LEITURA` consulta lista nominal de participantes | **403** |

### 11.5 Regressão estrutural

| # | Cenário | Resultado esperado |
|---|---|---|
| T28 | Busca no código por comparação com nome de grupo (`=== 'TESOURARIA'`) | **Nenhuma ocorrência** — lint |
| T29 | Toda permissão concedida a algum grupo existe no catálogo | **Verdadeiro** (G4) |
| T30 | Todo endpoint de escrita tem decorator de permissão | **Verdadeiro** — teste de metaprogramação sobre as rotas |

T30 é o mais valioso da lista: pega o endpoint novo que alguém esqueceu de proteger, que é como vazamento de permissão nasce na prática.

---

## 12. Seed inicial

```typescript
// migration — grupos protegidos
const GRUPOS_SEED = [
  {
    codigoSistema: 'ADMINISTRADOR',
    nome: 'Administrador',
    permissoes: TODAS_AS_PERMISSOES,
    protegido: true,
  },
  {
    codigoSistema: 'GOVERNANCA',
    nome: 'Governança',
    permissoes: [
      'financeiro.lancamento.ler', 'financeiro.conta.ler',
      'financeiro.dre.ler', 'financeiro.fluxo_caixa.ler',
      'financeiro.resultado_evento.ler', 'financeiro.reembolsos.ler',
      'financeiro.plano_contas.ler',
      'financeiro.adiantamento.autorizar',
      'financeiro.prestacao_contas.gerar', 'financeiro.prestacao_contas.detalhada',
      'eventos.inscricao.ler', 'eventos.arrecadacao.ler', 'eventos.operacao.ler',
      'eventos.contratacao.gerenciar',
      'pessoas.pessoa.ler', 'pessoas.vinculo.gerenciar',
      'estoque.saldo.ler',
      'sistema.auditoria.ler',
    ],
    protegido: true,
  },
  {
    codigoSistema: 'TESOURARIA',
    nome: 'Tesouraria',
    permissoes: [ /* ver matriz §6 */ ],
    protegido: true,
  },
  {
    codigoSistema: 'ACOLHIMENTO',
    nome: 'Acolhimento e Organização',
    permissoes: [
      'eventos.evento.criar', 'eventos.evento.editar',
      'eventos.evento.cancelar', 'eventos.evento.realizar',
      'eventos.inscricoes.abrir',
      'eventos.inscricao.registrar', 'eventos.inscricao.editar',
      'eventos.inscricao.confirmar', 'eventos.inscricao.cancelar',
      'eventos.inscricao.ler',
      'eventos.pagamento.registrar', 'eventos.arrecadacao.ler',
      'eventos.devolucao.solicitar',
      'eventos.operacao.ler', 'eventos.operacao.gerenciar',
      'eventos.acolhimento.registrar',
      'pessoas.pessoa.registrar', 'pessoas.pessoa.editar', 'pessoas.pessoa.ler',
      'pessoas.vinculo.gerenciar',
      'pessoas.anamnese.ler', 'pessoas.anamnese.analisar',
      'pessoas.anamnese.responder_por_terceiro',
      'pessoas.formulario.editar', 'pessoas.formulario.publicar',
      'pessoas.autorizacao_responsavel.registrar',
      'pessoas.consentimento.registrar',
      'estoque.consumo.registrar', 'estoque.saldo.ler',
      'financeiro.plano_contas.ler',   // para ver a tabela de contribuição do evento
    ],
    protegido: true,
  },
  {
    codigoSistema: 'REGISTRO',
    nome: 'Registro rápido',
    permissoes: [
      'financeiro.lancamento.registrar',
      'financeiro.lancamento.ler_proprios',   // v2.2 — fecha o ciclo da conferência
      'financeiro.plano_contas.ler',
      'estoque.movimento.registrar',
    ],
    protegido: true,
  },
  {
    codigoSistema: 'LEITURA',
    nome: 'Leitura',
    permissoes: [
      'financeiro.dre.ler', 'financeiro.fluxo_caixa.ler',
      'financeiro.resultado_evento.ler', 'financeiro.plano_contas.ler',
      'estoque.saldo.ler',
    ],
    protegido: true,
  },
];
```

---

## 13. Validação com a coordenação — respostas (v2.1)

As seis questões da v2.0 foram respondidas. Registro das decisões e do que cada uma mudou.

| # | Questão | Resposta | Efeito |
|---|---|---|---|
| 1 | O Acolhimento cria os eventos? | **Sim, no CDD.** Pode variar em outra casa. | Permissões mantidas. Variação por casa resolvida pelo seed por tenant (§9). Grupo renomeado para "Acolhimento e Organização". |
| 2 | A Tesouraria precisa marcar pagamento? | **Não precisa, mas é bom que possa.** | `eventos.pagamento.registrar` mantida na Tesouraria (§6.2). |
| 3 | Quem organiza a escala? | **Não haverá escala.** Os guardiões são poucos e revezam funções dentro da mesma cerimônia. | `Escala` removida do modelo (Doc 2 §2.8); quatro verificações de dois eixos eliminadas (§8.2); teste T20 substituído. |
| 4 | Quantos logins? | **~6 na largada**, com expansão. | Seis grupos mantidos, dois deles vazios por ora, com a justificativa em §5.4. |
| 5 | Padrinho e madrinha querem acesso? | **Sim.** | `GOVERNANCA` confirmado. Autorização de adiantamento segue o fluxo de dois eixos (§8.1), sem rota alternativa. |
| 6 | Quem registra o consumo de daime? | **Estimativa por número de pessoas; registro real por Acolhimento ou Administrador.** | `EstimativaDeConsumo` criada (Doc 2 §4.5.1); `estoque.consumo.registrar` mantida em Acolhimento e Administrador. |

### 13.1 O que ainda vale conferir

1. **A equipe consagra e não preenche anamnese.** É a única regra de **segurança** do sistema com uma exceção não declarada. Provavelmente intencional — são pessoas conhecidas, de participação contínua —, mas a diferença entre intencional e acidental importa aqui. Ver Doc 2, nota sobre IN11 e IN12.
2. **Consumo médio por consagrante.** Um número inicial arbitrado pela coordenação basta; o sistema recalibra sozinho com o histórico (Doc 2, EC4). Sem ele, a estimativa não sai do papel.
3. **Quem, na prática, vai registrar o consumo real?** A permissão está em dois grupos. Se for sempre a mesma pessoa e ela não for do acolhimento, talvez seja vínculo (`DIRIGENTE`) e não grupo — mesma discussão de §8.
4. **Revisão de acessos.** Com seis pessoas isso se resolve numa conversa. Vale marcar quando: sugestão de revisar a matriz ao fim da Fase 1, quando o uso real já mostrar o que ficou apertado ou frouxo demais.
