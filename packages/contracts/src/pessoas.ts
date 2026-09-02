/** Contexto Pessoas — Doc 2 §3 e §4 (anamnese). */
import type {
  Anexo,
  DataHora,
  DataLocal,
  EventoId,
  FormularioId,
  PerguntaId,
  PessoaId,
  RespostaId,
  UnidadeId,
} from './kernel.js';
import type { StatusAnamnese } from './eventos.js';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

export type Papel =
  | 'MEMBRO'
  | 'FREQUENTADOR'
  | 'VISITANTE'
  | 'GUARDIAO'
  | 'CUIDADORA'
  | 'MADRINHA'
  | 'PADRINHO'
  | 'MUSICO'
  | 'PRESTADOR'
  | 'FORNECEDOR'
  | 'CONTRATANTE';

export interface Vinculo {
  readonly papel: Papel;
  readonly desde: DataLocal;
  readonly ate: DataLocal | null;
  readonly unidadeId: UnidadeId | null;
}

export interface Pessoa {
  readonly id: PessoaId;
  readonly tipo: TipoPessoa;
  readonly nome: string;
  readonly apelido: string | null;
  readonly documento: string | null;
  readonly telefone: string | null;
  readonly email: string | null;
  readonly cidade: string | null;
  readonly nascimento: DataLocal | null;
  readonly foto: Anexo | null;
  readonly vinculos: readonly Vinculo[];
  readonly contatoEmergencia: string | null;
  readonly anamnese: StatusAnamnese;
  readonly anamneseValidaAte: DataLocal | null;
  readonly pontosDeAtencao: readonly string[];
  readonly ativa: boolean;
}

export type TipoPergunta = 'BOOLEANO' | 'TEXTO' | 'ESCOLHA_UNICA' | 'ESCOLHA_MULTIPLA' | 'DATA' | 'NUMERO';
export type StatusFormulario = 'RASCUNHO' | 'PUBLICADA' | 'ARQUIVADA';

export interface RegraDeAlerta {
  readonly quando: 'IGUAL' | 'DIFERENTE' | 'PREENCHIDO' | 'MAIOR_QUE';
  readonly valor: string | number | boolean | null;
  readonly mensagem: string;
}

export interface Pergunta {
  /** Estável entre versões — viabiliza o delta (Doc 2 §4). */
  readonly id: PerguntaId;
  readonly codigo: string;
  readonly texto: string;
  readonly tipo: TipoPergunta;
  readonly opcoes: readonly string[];
  readonly obrigatoria: boolean;
  /** Marca para acesso restrito e log — LGPD, Doc 1 §5.6. */
  readonly sensivel: boolean;
  readonly regraDeAlerta: RegraDeAlerta | null;
}

export interface FormularioDeAnamnese {
  readonly id: FormularioId;
  readonly versao: number;
  readonly status: StatusFormulario;
  readonly perguntas: readonly Pergunta[];
  readonly validadeMeses: number;
  readonly exigidaParaConfirmar: boolean;
  readonly publicadaEm: DataHora | null;
  readonly arquivadaEm: DataHora | null;
  readonly linkPublico: string | null;
  readonly respostas: number;
}

export interface RespostaDeAnamnese {
  readonly id: RespostaId;
  readonly pessoaId: PessoaId;
  readonly formularioId: FormularioId;
  readonly versaoFormulario: number;
  readonly respondidaEm: DataHora;
  readonly eventoId: EventoId | null;
  readonly pontosDeAtencao: readonly string[];
  /** Controle do titular: mostrar ou não os pontos ao guardião do trabalho. */
  readonly visivelAoGuardiao: boolean;
}
