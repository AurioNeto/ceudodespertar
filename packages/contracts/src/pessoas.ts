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

/* ---------------------------------------------------------------------------
   Anamnese respondida pela própria pessoa, online, durante a inscrição.

   Correção de premissa (coordenação, set/2026): **não existe preenchimento
   presencial**. O Doc 4 previa a tela `P-06`, de campo, com alguém do
   Acolhimento digitando pela pessoa; a casa não trabalha assim. Quem responde
   é o participante, no aparelho dele, pelo link da cerimônia. Some com isso a
   permissão `anamnese.responder_por_terceiro`, que não tem caso de uso.

   O cálculo de pendências continua sendo serviço de domínio (Doc 2 §3.4.3), e
   o resultado dele é o que a tela recebe: não uma lista de perguntas, mas uma
   lista de perguntas **com o motivo de estarem ali**. Sem o motivo, quem
   responde não entende por que a casa pergunta de novo algo que ela já
   respondeu — e é isso que faz a anamnese incremental parecer desleixo em vez
   de cuidado.
   --------------------------------------------------------------------------- */

export type MotivoDaPendencia =
  | { readonly tipo: 'PRIMEIRA_VEZ' }
  | { readonly tipo: 'NOVA_NA_VERSAO'; readonly versao: number }
  | { readonly tipo: 'SUBSTITUIU'; readonly textoAnterior: string }
  /** RA1 — resposta vencida exige revalidação completa, não incremental. */
  | { readonly tipo: 'REVALIDACAO' };

export interface PerguntaPendente {
  readonly pergunta: Pergunta;
  readonly motivo: MotivoDaPendencia;
}

/**
 * Resposta que atravessou a versão: a pergunta só teve correção cosmética,
 * manteve o `PerguntaId` e por isso não se pergunta de novo (Doc 2 §4).
 */
export interface RespostaHerdada {
  readonly perguntaId: PerguntaId;
  readonly texto: string;
  readonly valor: string;
  readonly deVersao: number;
}

export type ModoDePreenchimento = 'PRIMEIRA_VEZ' | 'INCREMENTAL' | 'REVALIDACAO_COMPLETA' | 'EM_DIA';

/**
 * Salvamento parcial contínuo. A anamnese interrompida não se perde — quem
 * responde está no celular, no meio da vida, e vai fechar a aba.
 */
export interface RascunhoDeAnamnese {
  readonly pessoaId: PessoaId;
  readonly versaoAlvo: number;
  readonly valores: Readonly<Record<string, string>>;
  readonly salvoEm: DataHora;
  readonly sincronizado: boolean;
}

/**
 * Declaração de veracidade — **por cerimônia**.
 *
 * Anamnese em dia não basta: a cada trabalho a pessoa declara que o que ela
 * respondeu continua verdadeiro para *aquela* data. É barato para quem está
 * bem e é a única forma de a casa saber de uma medicação que começou semana
 * passada sem obrigar todo mundo a refazer o formulário inteiro.
 */
export interface DeclaracaoDeVeracidade {
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  readonly respostaId: RespostaId;
  readonly texto: string;
  readonly declaradoEm: DataHora;
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
