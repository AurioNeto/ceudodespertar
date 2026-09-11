import type { Dormitorio, DormitorioId, Hospedagem, InscricaoId, LeitoId, TipoLeito, UnidadeId } from '@cdd/contracts';
import { id } from './ids';

/**
 * `E-10` e `E-15` — o mapa e o cadastro.
 *
 * A jornada de três dias é o evento do mapa porque tem **duas noites**: com
 * uma só, ML1 e ML4 não aparecem. O conflito com outro evento no mesmo local
 * está plantado de propósito na noite de 25 — é a limitação que o Doc 2 assume
 * e manda desenhar.
 */

export const eventoDoMapa = {
  id: 'e-jornada-2410',
  nome: 'Jornada de três dias',
  periodo: '24 a 26/10/2026',
  local: 'Chácara · Ibiúna',
  noites: [
    { chave: '2026-10-24', rotulo: 'noite de 24', curto: '24/10' },
    { chave: '2026-10-25', rotulo: 'noite de 25', curto: '25/10' },
  ],
} as const;

export type NoiteId = (typeof eventoDoMapa.noites)[number]['chave'];

/**
 * Outro evento da casa no mesmo local e na mesma noite. Não bloqueia nada — o
 * agregado é por evento, e checar isso exigiria um agregado de ocupação global
 * que seria ponto de contenção. Vira aviso, e o aviso tem que ser visível.
 */
export const conflitoDeAgenda = {
  noite: '2026-10-25' as NoiteId,
  evento: 'Temazcal da Munay',
  local: 'Chácara · Ibiúna',
  leitosQueEleUsa: 4,
  observacao: 'Contratação da Munay marcada para a mesma noite, no mesmo local.',
};

const dorm = (n: string) => id<DormitorioId>(n);
const leito = (n: string) => id<LeitoId>(n);

const L = (n: string, identificacao: string, tipo: TipoLeito, ativo = true) => ({
  id: leito(n),
  identificacao,
  tipo,
  ativo,
});

export const dormitorios: readonly Dormitorio[] = [
  {
    id: dorm('d-fem'),
    unidadeId: id<UnidadeId>('u-dorm'),
    nome: 'Dormitório feminino',
    ativo: true,
    leitos: [
      L('l-f1', 'F1 · superior', 'BELICHE_SUPERIOR'),
      L('l-f2', 'F2 · inferior', 'BELICHE_INFERIOR'),
      L('l-f3', 'F3 · superior', 'BELICHE_SUPERIOR'),
      L('l-f4', 'F4 · inferior', 'BELICHE_INFERIOR'),
    ],
  },
  {
    id: dorm('d-masc'),
    unidadeId: id<UnidadeId>('u-dorm'),
    nome: 'Dormitório masculino',
    ativo: true,
    leitos: [
      L('l-m1', 'M1 · superior', 'BELICHE_SUPERIOR'),
      L('l-m2', 'M2 · inferior', 'BELICHE_INFERIOR'),
      L('l-m3', 'M3 · superior', 'BELICHE_SUPERIOR', false),
    ],
  },
  {
    id: dorm('d-quartos'),
    unidadeId: id<UnidadeId>('u-dorm'),
    nome: 'Quartos da sede',
    ativo: true,
    leitos: [L('l-q1', 'Quarto 1', 'QUARTO_PRIVATIVO'), L('l-q2', 'Quarto 2', 'QUARTO_PRIVATIVO')],
  },
];

export const TIPO_LEITO_ROTULO: Record<TipoLeito, string> = {
  BELICHE_SUPERIOR: 'Beliche superior',
  BELICHE_INFERIOR: 'Beliche inferior',
  CAMA_SOLTEIRO: 'Cama de solteiro',
  QUARTO_PRIVATIVO: 'Quarto privativo',
};

/* ── Quem pediu hospedagem ───────────────────────────────────────────────── */

export interface HospedeDoEvento {
  readonly inscricaoId: InscricaoId;
  readonly nome: string;
  readonly hospedagem: Hospedagem;
  readonly noites: readonly NoiteId[];
  readonly observacao: string | null;
}

export const hospedes: readonly HospedeDoEvento[] = [
  {
    inscricaoId: id<InscricaoId>('i-501'),
    nome: 'Ana Beatriz Cordeiro',
    hospedagem: 'BELICHE',
    noites: ['2026-10-24', '2026-10-25'],
    observacao: null,
  },
  {
    inscricaoId: id<InscricaoId>('i-502'),
    nome: 'Helena Duarte',
    hospedagem: 'BELICHE',
    noites: ['2026-10-24', '2026-10-25'],
    observacao: 'Gestante — pediu leito inferior.',
  },
  {
    inscricaoId: id<InscricaoId>('i-503'),
    nome: 'Clarice Fontes',
    hospedagem: 'BELICHE',
    noites: ['2026-10-25'],
    observacao: 'Chega só no segundo dia.',
  },
  {
    inscricaoId: id<InscricaoId>('i-504'),
    nome: 'Sérgio Bittencourt',
    hospedagem: 'BELICHE',
    noites: ['2026-10-24', '2026-10-25'],
    observacao: null,
  },
  {
    inscricaoId: id<InscricaoId>('i-505'),
    nome: 'Tobias Aguiar',
    hospedagem: 'QUARTO',
    noites: ['2026-10-24', '2026-10-25'],
    observacao: 'Dirigente do trabalho.',
  },
  {
    inscricaoId: id<InscricaoId>('i-506'),
    nome: 'Rosa Silveira',
    hospedagem: 'BELICHE',
    noites: ['2026-10-24'],
    observacao: null,
  },
];

/**
 * ML2 tem um lado que a tela precisa mostrar: quem **não** entra no mapa.
 * Colchonete não ocupa leito, e sem hospedagem não ocupa nada — mas as duas
 * pessoas existem e a operação precisa saber que elas dormem na casa.
 */
export const foraDoMapa: readonly { nome: string; hospedagem: Hospedagem; razao: string }[] = [
  { nome: 'Marina Tavares', hospedagem: 'COLCHONETE', razao: 'Dorme na igreja, em colchonete próprio.' },
  { nome: 'Bruna Camargo', hospedagem: 'COLCHONETE', razao: 'Dorme na igreja, em colchonete próprio.' },
  { nome: 'Eduardo Pires', hospedagem: 'SEM_HOSPEDAGEM', razao: 'Vai embora depois do trabalho.' },
];

/** Alocações já feitas quando a tela abre. `leitoId → noiteId → inscricaoId`. */
export const alocacaoInicial: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'l-f1': { '2026-10-24': 'i-501', '2026-10-25': 'i-501' },
  'l-q1': { '2026-10-24': 'i-505', '2026-10-25': 'i-505' },
};

/**
 * ML3 aconteceu ontem: o Acolhimento cancelou uma inscrição e o leito voltou
 * para o mapa sozinho. Fica dito para que a vaga livre tenha história.
 */
export const liberadoPorCancelamento = {
  leitoId: 'l-f2',
  nome: 'Rita Belmonte',
  quando: '10/09',
};
