# TSK-309: Menu filtrado por permissão e `PermissionDenied`

- **Estado:** ✅ Concluída
- **Peça do plano:** W04
- **Responsável sugerido:** vitro
- **Depende de:** [TSK-308](TSK-308-faixa-de-demonstracao-e-meu-perfil.md)

## Contexto

O shell (T-05) precisa refletir o `pode()`.

## O que precisa ser feito

- Filtrar o menu de `navegacao.ts` por permissão.
- Link direto sem permissão mostra `PermissionDenied`.
- Corrigir o oxlint pré-existente em `navegacao.ts` (`sort`).

## Critérios de aceite

- O grupo REGISTRO não vê Verificação
- Link direto mostra `PermissionDenied`

## Decisões do dono (08/10/2026)

- **Registro:** cada tela de `app/telas.ts` ganha `acesso: readonly Permissao[]`. Basta uma das permissões para ver a tela, e lista vazia significa tela livre. Cada tela passa a ter objeto próprio.
- **Permissão por tela:**
  - Livres: Painel e Meu perfil.
  - Uma permissão:
    - Registrar: `financeiro.lancamento.registrar`.
    - Meus registros: `financeiro.lancamento.ler_proprios`.
    - Verificação de lote: `financeiro.lancamento.confirmar`.
    - Lançamentos: `financeiro.lancamento.ler`.
    - Contas: `financeiro.conta.ler`.
    - Faturas: `financeiro.fatura.gerenciar`.
    - Empréstimos: `financeiro.emprestimo.gerenciar`.
    - Fechamento: `financeiro.periodo.fechar`.
    - Conciliação: `financeiro.conciliacao.executar`.
    - Devoluções: `eventos.devolucao.efetivar`.
    - Prestação: `financeiro.prestacao_contas.gerar`.
    - Inscrição: `eventos.inscricao.ler`.
    - Leitos: `eventos.operacao.ler`.
    - Contratações: `eventos.contratacao.gerenciar`.
    - Ayahuasca: `estoque.saldo.ler`.
    - Feitio: `estoque.feitio.gerenciar`.
    - Pessoas: `pessoas.pessoa.ler`.
    - Anamnese: `pessoas.anamnese.ler`.
    - Auditoria: `sistema.auditoria.ler`.
  - Basta uma entre várias:
    - Adiantamentos: `financeiro.adiantamento.registrar`, `.autorizar` ou `.ressarcir`.
    - Relatórios: `financeiro.dre.ler`, `.fluxo_caixa.ler` ou `.resultado_evento.ler`.
    - Parâmetros: `financeiro.plano_contas.gerenciar` ou `sistema.parametro.gerenciar`.
    - Agenda: `eventos.evento.editar` ou `eventos.inscricao.ler`.
- **Menu:**
  - Esconde as telas sem permissão.
  - Uma seção que fica sem itens some junto com o título.
  - No celular, a barra inferior mostra os 4 primeiros itens que sobram depois do filtro.
- **Link direto sem permissão:** o shell continua e a tela dá lugar ao `PermissionDenied`, com o cabeçalho dela.
  - A faixa de demonstração não aparece.
  - A mensagem mostra o grupo do usuário e a primeira permissão da lista.
  - A verificação que existia dentro da `RegistrarLancamentoPage` sai, e o nome que estava fixo no texto dá lugar ao padrão "o administrador".
- **oxlint:** a ordenação por `sort` em `rotaAtiva` dá lugar a uma busca do prefixo mais longo. O tsconfig não muda, porque o `lib` é ES2022.
- **Fora do escopo:** os atalhos internos, como o "Verificar lote" do Painel e o checklist do Fechamento, continuam visíveis e levam ao `PermissionDenied`. Escondê-los fica para quando cada tela for ligada à API.

## Como terminou

O PR #46 foi mesclado na main em 08/10/2026 (`c1bace3`).
- As telas de `app/telas.ts` têm `acesso`, e a tabela aprovada está fixada em `telas.test.ts`.
- O menu filtra pelo `pode()` e some com a seção que fica vazia. O grupo Registro rápido vê só Painel, Registrar e Meus registros.
- Um link direto sem permissão mostra o `PermissionDenied` dentro do shell, sem a faixa e sem montar a página.
- `rotaAtiva` deixou de usar `sort`.
- A sessão de demonstração do dev entra como Administrador, com o catálogo inteiro.
- O PR #45 (TSK-304, parte 1) entrou na main antes deste. A suíte completa foi rodada no commit do merge e passou: web 330, api 1166, integração 291, além de typecheck, lint, fronteiras e build.

## O que resta

- Os atalhos internos ("Verificar lote" no Painel, checklist do Fechamento) levam ao `PermissionDenied` em vez de sumirem. Escondê-los fica para quando cada tela for ligada à API.
- `filtrarNavPorAcesso` converte o id do menu com `as RotaId` sem checagem, e nenhum teste cruza os ids do `construirNav` com as `ROTAS`.
- A tela bloqueada não foi conferida no navegador.
- O lint da raiz não cobre o `apps/web` (TSK-407).

_Atualizado em 08/10/2026._
