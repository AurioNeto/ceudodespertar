import type {
  OperacaoAuditada,
  PessoaId,
  RegistroAcessoId,
  RegistroAuditoriaId,
  RegistroDeAcesso,
  RegistroDeAuditoria,
  UsuarioId,
} from '@cdd/contracts';
import { dataHora } from '@cdd/contracts';
import { id } from './ids';

/**
 * A trilha e o log de acesso — Doc 3 §10.4 e Doc 2, RA3.
 *
 * Duas coleções, não uma com filtro. A trilha geral conta o que a casa fez; o
 * log de acesso conta o que alguém **leu** de dado de saúde. São públicos
 * diferentes: a trilha é do Administrador, o log é o contrapeso da Governança
 * sobre o Acolhimento — e por isso a leitura de anamnese aparece nos dois, com
 * o corpo do dado em nenhum.
 */

export interface FeicaoDaOperacao {
  readonly rotulo: string;
  /** Verbo curto para a linha: "estornou", "fechou", "abriu". */
  readonly verbo: string;
  readonly icone:
    | 'circle-check'
    | 'undo-2'
    | 'message-circle-question'
    | 'lock'
    | 'lock-open'
    | 'file-down'
    | 'file-spreadsheet'
    | 'shield-half'
    | 'key-round'
    | 'user-plus'
    | 'user-x'
    | 'clipboard-list'
    | 'eye'
    | 'scroll-text';
  readonly tom: 'neutro' | 'atencao' | 'sensivel';
}

export const FEICAO: Record<OperacaoAuditada, FeicaoDaOperacao> = {
  LANCAMENTO_CONFIRMADO: { rotulo: 'Lançamento consolidado', verbo: 'consolidou', icone: 'circle-check', tom: 'neutro' },
  LANCAMENTO_ESTORNADO: { rotulo: 'Lançamento estornado', verbo: 'estornou', icone: 'undo-2', tom: 'atencao' },
  PENDENCIA_ABERTA: { rotulo: 'Pendência aberta', verbo: 'devolveu com pendência', icone: 'message-circle-question', tom: 'neutro' },
  PERIODO_FECHADO: { rotulo: 'Período fechado', verbo: 'fechou', icone: 'lock', tom: 'neutro' },
  PERIODO_REABERTO: { rotulo: 'Período reaberto', verbo: 'reabriu', icone: 'lock-open', tom: 'atencao' },
  PRESTACAO_GERADA: { rotulo: 'Prestação de contas gerada', verbo: 'gerou', icone: 'file-down', tom: 'neutro' },
  EXTRATO_IMPORTADO: { rotulo: 'Extrato importado', verbo: 'importou', icone: 'file-spreadsheet', tom: 'neutro' },
  ADIANTAMENTO_AUTORIZADO: { rotulo: 'Adiantamento autorizado', verbo: 'autorizou', icone: 'shield-half', tom: 'neutro' },
  GRUPO_ALTERADO: { rotulo: 'Grupo de usuário alterado', verbo: 'mudou o grupo de', icone: 'key-round', tom: 'atencao' },
  USUARIO_CONVIDADO: { rotulo: 'Usuário convidado', verbo: 'convidou', icone: 'user-plus', tom: 'neutro' },
  USUARIO_SUSPENSO: { rotulo: 'Usuário suspenso', verbo: 'suspendeu', icone: 'user-x', tom: 'atencao' },
  FORMULARIO_PUBLICADO: { rotulo: 'Formulário publicado', verbo: 'publicou', icone: 'clipboard-list', tom: 'neutro' },
  PESSOA_ANONIMIZADA: { rotulo: 'Pessoa anonimizada', verbo: 'anonimizou', icone: 'user-x', tom: 'atencao' },
  ANAMNESE_LIDA: { rotulo: 'Anamnese lida', verbo: 'abriu a anamnese de', icone: 'eye', tom: 'sensivel' },
  AUDITORIA_CONSULTADA: { rotulo: 'Auditoria consultada', verbo: 'consultou', icone: 'scroll-text', tom: 'sensivel' },
};

/** Operações cujo registro extra o domínio exige — Doc 3 §10.4. */
export const EXIGE_REGISTRO_EXTRA: Partial<Record<OperacaoAuditada, string>> = {
  LANCAMENTO_ESTORNADO: 'motivo textual obrigatório',
  PERIODO_REABERTO: 'motivo textual obrigatório',
  GRUPO_ALTERADO: 'grupo anterior, grupo novo e autor',
  PRESTACAO_GERADA: 'período, nível, hash e autor',
  PESSOA_ANONIMIZADA: 'autor e base legal invocada',
  PENDENCIA_ABERTA: 'texto, autor e destinatário',
  ANAMNESE_LIDA: 'quem leu, de quem e quando',
};

const aud = (n: string) => id<RegistroAuditoriaId>(n);
const usr = (n: string) => id<UsuarioId>(n);

export const trilha: readonly RegistroDeAuditoria[] = [
  {
    id: aud('a-31'),
    em: dataHora('2026-09-02T11:40:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'AUDITORIA_CONSULTADA',
    alvo: 'log de acesso a dado sensível · últimos 30 dias',
    referencia: null,
    detalhes: [{ rotulo: 'Visão', valor: 'Acesso a dado sensível' }],
    sensivel: true,
  },
  {
    id: aud('a-30'),
    em: dataHora('2026-09-02T10:22:00-03:00'),
    autorId: usr('u-aurio'),
    autorNome: 'Aurio Neto',
    autorGrupo: 'Tesouraria',
    operacao: 'EXTRATO_IMPORTADO',
    alvo: 'Sicoob · conta corrente · 01/08 a 31/08',
    referencia: 'imp-2026-08-sicoob',
    detalhes: [
      { rotulo: 'Linhas lidas', valor: '134' },
      { rotulo: 'Ignoradas por FITID já visto', valor: '12' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-29'),
    em: dataHora('2026-09-02T09:58:00-03:00'),
    autorId: usr('u-marcia'),
    autorNome: 'Márcia Lemos',
    autorGrupo: 'Acolhimento',
    operacao: 'ANAMNESE_LIDA',
    alvo: 'Eduardo Pires',
    referencia: 'resp-eduardo-v2',
    detalhes: [{ rotulo: 'Contexto', valor: 'Inscrição · Trabalho de 05/09' }],
    sensivel: true,
  },
  {
    id: aud('a-28'),
    em: dataHora('2026-09-02T09:41:00-03:00'),
    autorId: usr('u-marcia'),
    autorNome: 'Márcia Lemos',
    autorGrupo: 'Acolhimento',
    operacao: 'ANAMNESE_LIDA',
    alvo: 'Helena Duarte',
    referencia: 'resp-helena-v3',
    detalhes: [{ rotulo: 'Contexto', valor: 'Inscrição · Trabalho de 05/09' }],
    sensivel: true,
  },
  {
    id: aud('a-27'),
    em: dataHora('2026-09-01T18:05:00-03:00'),
    autorId: usr('u-aurio'),
    autorNome: 'Aurio Neto',
    autorGrupo: 'Tesouraria',
    operacao: 'LANCAMENTO_ESTORNADO',
    alvo: 'Saída de R$ 1.240,00 · Casa do Construtor · 21/08',
    referencia: 'lanc-8841',
    detalhes: [
      {
        rotulo: 'Motivo',
        valor: 'Nota lançada em duplicidade — a mesma compra entrou pelo OFX e pelo registro manual do Sérgio.',
      },
      { rotulo: 'Lançamento de estorno', valor: 'lanc-9012' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-26'),
    em: dataHora('2026-09-01T16:30:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'ADIANTAMENTO_AUTORIZADO',
    alvo: 'R$ 800,00 a Sérgio Bittencourt · compras do feitio',
    referencia: 'adi-114',
    detalhes: [{ rotulo: 'Vínculo verificado', valor: 'Madrinha — exigido por A1' }],
    sensivel: false,
  },
  {
    id: aud('a-25'),
    em: dataHora('2026-09-01T14:12:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'GRUPO_ALTERADO',
    alvo: 'Rita Belmonte',
    referencia: 'u-rita',
    detalhes: [{ rotulo: 'Grupo', valor: 'Tesouraria', anterior: 'Registro' }],
    sensivel: false,
  },
  {
    id: aud('a-24'),
    em: dataHora('2026-09-01T11:03:00-03:00'),
    autorId: usr('u-aurio'),
    autorNome: 'Aurio Neto',
    autorGrupo: 'Tesouraria',
    operacao: 'PENDENCIA_ABERTA',
    alvo: 'Saída de R$ 318,90 · Hortifruti Serra · 29/08',
    referencia: 'lanc-8996',
    detalhes: [
      { rotulo: 'Destinatário', valor: 'Sérgio Bittencourt — quem registrou' },
      { rotulo: 'Texto', valor: 'Isso é da cerimônia de 22 ou do feitio? A foto não mostra a data do cupom.' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-23'),
    em: dataHora('2026-08-31T17:47:00-03:00'),
    autorId: usr('u-marcia'),
    autorNome: 'Márcia Lemos',
    autorGrupo: 'Acolhimento',
    operacao: 'ANAMNESE_LIDA',
    alvo: 'Tobias Aguiar',
    referencia: 'resp-tobias-v3',
    detalhes: [],
    sensivel: true,
  },
  {
    id: aud('a-22'),
    em: dataHora('2026-08-31T15:20:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'PRESTACAO_GERADA',
    alvo: 'Julho de 2026 · nível assembleia',
    referencia: 'pc-2026-07-assembleia',
    detalhes: [
      { rotulo: 'Nível', valor: 'Assembleia — sem nome de pessoa física' },
      { rotulo: 'Hash', valor: 'sha256:4f2c…a91b' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-21'),
    em: dataHora('2026-08-31T10:08:00-03:00'),
    autorId: usr('u-aurio'),
    autorNome: 'Aurio Neto',
    autorGrupo: 'Tesouraria',
    operacao: 'PERIODO_REABERTO',
    alvo: 'Competência 07/2026',
    referencia: '2026-07',
    detalhes: [
      {
        rotulo: 'Motivo',
        valor: 'Chegou a nota do encanador com data de 18/07 — competência de julho, pagamento em agosto.',
      },
      { rotulo: 'Fechado antes em', valor: '10/08/2026 por Aurio Neto' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-20'),
    em: dataHora('2026-08-30T19:11:00-03:00'),
    autorId: usr('u-rita'),
    autorNome: 'Rita Belmonte',
    autorGrupo: 'Registro',
    operacao: 'LANCAMENTO_CONFIRMADO',
    alvo: 'Entrada de R$ 4.150,00 · contribuições do trabalho de 29/08',
    referencia: 'lanc-8971',
    detalhes: [{ rotulo: 'Origem', valor: 'Verificação de lote — 23 registros de uma vez' }],
    sensivel: false,
  },
  {
    id: aud('a-19'),
    em: dataHora('2026-08-29T21:40:00-03:00'),
    autorId: usr('u-marcia'),
    autorNome: 'Márcia Lemos',
    autorGrupo: 'Acolhimento',
    operacao: 'ANAMNESE_LIDA',
    alvo: 'Marina Tavares',
    referencia: 'resp-marina-nova',
    detalhes: [{ rotulo: 'Contexto', valor: 'Atendimento · primeira vez na casa' }],
    sensivel: true,
  },
  {
    id: aud('a-18'),
    em: dataHora('2026-08-28T13:26:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'FORMULARIO_PUBLICADO',
    alvo: 'Anamnese v3',
    referencia: 'form-v3',
    detalhes: [
      { rotulo: 'Impacto simulado antes de publicar', valor: '18 pessoas passaram a ter pendência' },
      { rotulo: 'Versão anterior', valor: 'v2 — marcada como supersedida' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-17'),
    em: dataHora('2026-08-27T09:15:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'USUARIO_SUSPENSO',
    alvo: 'Wagner Prado',
    referencia: 'u-wagner',
    detalhes: [{ rotulo: 'Situação', valor: 'Suspenso', anterior: 'Ativo' }],
    sensivel: false,
  },
  {
    id: aud('a-16'),
    em: dataHora('2026-08-26T16:52:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'USUARIO_CONVIDADO',
    alvo: 'Rita Belmonte · rita@ceudodespertar.org',
    referencia: 'u-rita',
    detalhes: [{ rotulo: 'Grupo no convite', valor: 'Registro' }],
    sensivel: false,
  },
  {
    id: aud('a-15'),
    em: dataHora('2026-08-25T11:30:00-03:00'),
    autorId: usr('u-teresa'),
    autorNome: 'Teresa Andrade',
    autorGrupo: 'Governança',
    operacao: 'PESSOA_ANONIMIZADA',
    alvo: 'Pessoa #418',
    referencia: 'p-418',
    detalhes: [
      { rotulo: 'Base legal', valor: 'Pedido de exclusão da titular — LGPD art. 18, VI' },
      { rotulo: 'Preservado', valor: 'Lançamentos, sem nome — a contabilidade não se apaga' },
    ],
    sensivel: false,
  },
  {
    id: aud('a-14'),
    em: dataHora('2026-08-10T18:00:00-03:00'),
    autorId: usr('u-aurio'),
    autorNome: 'Aurio Neto',
    autorGrupo: 'Tesouraria',
    operacao: 'PERIODO_FECHADO',
    alvo: 'Competência 07/2026',
    referencia: '2026-07',
    detalhes: [{ rotulo: 'Fila de conferência', valor: 'Vazia — condição de P1' }],
    sensivel: false,
  },
];

/* ── Log de acesso a dado sensível ───────────────────────────────────────── */

const ace = (n: string) => id<RegistroAcessoId>(n);
const pes = (n: string) => id<PessoaId>(n);

export const acessos: readonly RegistroDeAcesso[] = [
  {
    id: ace('ac-14'),
    em: dataHora('2026-09-02T09:58:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-4'),
    pessoaNome: 'Eduardo Pires',
    contexto: { tipo: 'INSCRICAO', descricao: 'Trabalho de 05/09 · conferência de anamnese vencida' },
  },
  {
    id: ace('ac-13'),
    em: dataHora('2026-09-02T09:41:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-7'),
    pessoaNome: 'Helena Duarte',
    contexto: { tipo: 'INSCRICAO', descricao: 'Trabalho de 05/09 · gestante, participação fora do salão' },
  },
  {
    id: ace('ac-12'),
    em: dataHora('2026-09-01T20:14:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-1'),
    pessoaNome: 'Ana Beatriz Cordeiro',
    contexto: { tipo: 'REVISAO', descricao: 'Revisão da fila de anamnese' },
  },
  {
    id: ace('ac-11'),
    em: dataHora('2026-09-01T20:12:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-2'),
    pessoaNome: 'Carlos Menezes',
    contexto: { tipo: 'REVISAO', descricao: 'Revisão da fila de anamnese' },
  },
  {
    id: ace('ac-10'),
    em: dataHora('2026-09-01T20:11:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-3'),
    pessoaNome: 'Rosa Silveira',
    contexto: { tipo: 'REVISAO', descricao: 'Revisão da fila de anamnese' },
  },
  {
    id: ace('ac-09'),
    em: dataHora('2026-09-01T20:09:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-6'),
    pessoaNome: 'Sérgio Bittencourt',
    contexto: { tipo: 'REVISAO', descricao: 'Revisão da fila de anamnese' },
  },
  {
    id: ace('ac-08'),
    em: dataHora('2026-08-31T17:47:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-8'),
    pessoaNome: 'Tobias Aguiar',
    contexto: null,
  },
  {
    id: ace('ac-07'),
    em: dataHora('2026-08-30T15:02:00-03:00'),
    leitorId: usr('u-joana'),
    leitorNome: 'Joana Ribeiro',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-5'),
    pessoaNome: 'Marina Tavares',
    contexto: { tipo: 'ATENDIMENTO', descricao: 'Conversa de acolhimento · primeira vez' },
  },
  {
    id: ace('ac-06'),
    em: dataHora('2026-08-29T21:40:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-5'),
    pessoaNome: 'Marina Tavares',
    contexto: { tipo: 'ATENDIMENTO', descricao: 'Trabalho de 29/08 · alerta na triagem' },
  },
  {
    id: ace('ac-05'),
    em: dataHora('2026-08-29T18:22:00-03:00'),
    leitorId: usr('u-joana'),
    leitorNome: 'Joana Ribeiro',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-9'),
    pessoaNome: 'Bruna Camargo',
    contexto: { tipo: 'INSCRICAO', descricao: 'Trabalho de 29/08 · sem anamnese, orientada a responder' },
  },
  {
    id: ace('ac-04'),
    em: dataHora('2026-08-28T10:40:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-4'),
    pessoaNome: 'Eduardo Pires',
    contexto: { tipo: 'REVISAO', descricao: 'Impacto da v3 · quem ficou com pendência' },
  },
  {
    id: ace('ac-03'),
    em: dataHora('2026-08-27T19:55:00-03:00'),
    leitorId: usr('u-teresa'),
    leitorNome: 'Teresa Andrade',
    leitorGrupo: 'Governança',
    pessoaId: pes('p-7'),
    pessoaNome: 'Helena Duarte',
    contexto: { tipo: 'ATENDIMENTO', descricao: 'Decisão sobre participação de gestante' },
  },
  {
    id: ace('ac-02'),
    em: dataHora('2026-08-26T08:30:00-03:00'),
    leitorId: usr('u-joana'),
    leitorNome: 'Joana Ribeiro',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-10'),
    pessoaNome: 'Otávio Lins',
    contexto: null,
  },
  {
    id: ace('ac-01'),
    em: dataHora('2026-08-22T14:18:00-03:00'),
    leitorId: usr('u-marcia'),
    leitorNome: 'Márcia Lemos',
    leitorGrupo: 'Acolhimento',
    pessoaId: pes('p-6'),
    pessoaNome: 'Sérgio Bittencourt',
    contexto: { tipo: 'INSCRICAO', descricao: 'Trabalho de 22/08 · cirurgia cardíaca declarada' },
  },
];

export const CONTEXTO_ROTULO: Record<'INSCRICAO' | 'REVISAO' | 'ATENDIMENTO', string> = {
  INSCRICAO: 'Inscrição',
  REVISAO: 'Revisão de fila',
  ATENDIMENTO: 'Atendimento',
};

/** Quem aparece nos filtros — vem dos próprios registros, sem lista à parte. */
export const autoresDaTrilha = (registros: readonly RegistroDeAuditoria[]): readonly string[] =>
  [...new Set(registros.map((r) => r.autorNome))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
