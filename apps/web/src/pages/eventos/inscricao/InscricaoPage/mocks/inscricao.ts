import type { EventoId, ModalidadeCrianca, PessoaId, StatusAcolhimento, StatusAnamnese } from '@cdd/contracts';
import { id } from '@/mocks/ids';
import { eventos } from '../../mocks/eventos';

/* ── Diretório, do jeito que a busca da tela devolve ─────────────────────── */

export interface AutorizacaoVigente {
  readonly eventoId: EventoId;
  readonly modalidade: ModalidadeCrianca;
}

export interface PessoaDoDiretorio {
  readonly id: PessoaId;
  readonly nome: string;
  readonly vinculo: string;
  readonly cidade: string;
  readonly nascimento: string;
  readonly menorDeIdade: boolean;
  readonly anamnese: StatusAnamnese;
  readonly anamneseNota: string;
  readonly jaParticipou: boolean;
  readonly acolhimento: StatusAcolhimento;
  readonly contatoEmergencia: string | null;
  readonly restricoes: string | null;
  /** Quem pode figurar como responsável de uma criança estelar. */
  readonly responsavelDe: readonly string[];
  readonly autorizacoesVigentes: readonly AutorizacaoVigente[];
}

const LUA_CHEIA = eventos[0]!.id;

export const diretorio: readonly PessoaDoDiretorio[] = [
  {
    id: id<PessoaId>('p-7'),
    nome: 'Helena Duarte',
    vinculo: 'Frequentadora desde 2019',
    cidade: 'São Roque · SP',
    nascimento: '22/02/1996',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 28/07/2026 · v3 · vale até 28/07/2027',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Paulo Duarte · (11) 99000-8877',
    restricoes: 'Não come carne vermelha',
    responsavelDe: ['Antônio Duarte'],
    autorizacoesVigentes: [{ eventoId: LUA_CHEIA, modalidade: 'PERMANECE_SOB_SUPERVISAO' }],
  },
  {
    id: id<PessoaId>('p-5'),
    nome: 'Marina Tavares',
    vinculo: 'Visitante',
    cidade: 'Rio de Janeiro · RJ',
    nascimento: '05/06/1991',
    menorDeIdade: false,
    anamnese: 'PENDENTE',
    anamneseNota: 'Nunca respondeu',
    jaParticipou: false,
    acolhimento: 'PENDENTE',
    contatoEmergencia: 'Luiz Tavares · (21) 98800-4411',
    restricoes: null,
    responsavelDe: [],
    autorizacoesVigentes: [],
  },
  {
    id: id<PessoaId>('p-4'),
    nome: 'Eduardo Pires',
    vinculo: 'Frequentador desde 2022',
    cidade: 'São Paulo · SP',
    nascimento: '19/11/1993',
    menorDeIdade: false,
    anamnese: 'VENCIDA',
    anamneseNota: 'Respondida em 11/03/2024 · v2 · venceu em 11/03/2025',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Silvia Pires · (11) 99933-1200',
    restricoes: null,
    responsavelDe: [],
    autorizacoesVigentes: [],
  },
  {
    id: id<PessoaId>('p-6'),
    nome: 'Sérgio Bittencourt',
    vinculo: 'Fardado desde 2011 · guardião',
    cidade: 'Vargem Grande · SP',
    nascimento: '30/08/1968',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 01/08/2026 · v3 · vale até 01/08/2027',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Neide Bittencourt · (11) 98811-0099',
    restricoes: 'Evitar jejum prolongado',
    responsavelDe: [],
    autorizacoesVigentes: [],
  },
  {
    id: id<PessoaId>('p-antonio'),
    nome: 'Antônio Duarte',
    vinculo: 'Criança · filho de Helena Duarte',
    cidade: 'São Roque · SP',
    nascimento: '14/03/2019',
    menorDeIdade: true,
    anamnese: 'PENDENTE',
    anamneseNota: 'Nunca respondeu',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Helena Duarte · (11) 98444-2210',
    restricoes: 'Alergia a amendoim',
    responsavelDe: [],
    autorizacoesVigentes: [],
  },
  {
    id: id<PessoaId>('p-bruna'),
    nome: 'Bruna Camargo',
    vinculo: 'Visitante',
    cidade: 'Campinas · SP',
    nascimento: '08/12/1999',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 30/08/2026 · v3 · vale até 30/08/2027',
    jaParticipou: false,
    acolhimento: 'REALIZADO',
    contatoEmergencia: 'Tais Camargo · (19) 99888-1122',
    restricoes: 'Vegetariana',
    responsavelDe: [],
    autorizacoesVigentes: [],
  },
];
