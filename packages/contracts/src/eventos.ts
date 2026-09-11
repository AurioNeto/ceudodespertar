/** Contexto Eventos — Doc 2 §2. */
import type {
  Anexo,
  ContaId,
  DataLocal,
  DevolucaoId,
  Dinheiro,
  DormitorioId,
  EventoId,
  InscricaoId,
  LeitoId,
  PessoaId,
  TarefaId,
  UnidadeId,
} from './kernel.js';

export type TipoEvento = 'CERIMONIA' | 'FEITIO' | 'CONCENTRACAO' | 'CURA' | 'BAILADO' | 'REUNIAO' | 'TEMAZCAL' | 'JORNADA' | 'SHOW' | 'ENCONTRO';
export type RegimeDeReceita = 'CONTRIBUICAO' | 'CONTRATADO' | 'INTERNO';
export type StatusEvento = 'PLANEJADO' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO';

export interface Evento {
  readonly id: EventoId;
  readonly nome: string;
  readonly tipo: TipoEvento;
  readonly regimeDeReceita: RegimeDeReceita;
  readonly status: StatusEvento;
  readonly dataInicio: DataLocal;
  readonly dataFim: DataLocal;
  readonly horaInicio: string;
  readonly horaAbertura: string | null;
  readonly local: string;
  readonly unidadeId: UnidadeId;
  readonly dirigente: string;
  readonly cartaz: Anexo | null;
  readonly capacidade: number;
  readonly leitos: number;
  readonly litrosPrevistos: number;
  /** Opções de contribuição sugerida — o participante escolhe (chat 3). */
  readonly contribuicoesSugeridas: readonly Dinheiro[];
  readonly permiteValorLivre: boolean;
  readonly observacoes: string | null;
  readonly versaoFormularioAnamnese: number;
}

export type TipoParticipacao = 'PARTICIPANTE' | 'CRIANCA_ESTELAR' | 'EQUIPE' | 'CONVIDADO';
export type StatusInscricao = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA';
export type StatusAnamnese = 'PENDENTE' | 'OK' | 'VENCIDA' | 'NAO_APLICAVEL';

export interface Inscricao {
  readonly id: InscricaoId;
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly tipoParticipacao: TipoParticipacao;
  readonly status: StatusInscricao;
  readonly primeiraVezNaCasa: boolean;
  readonly primeiraVezNaAyahuasca: boolean;
  /** Explícito, não derivado da regra de anamnese — v2.1 §18. */
  readonly consagra: boolean;
  readonly contribuicaoEscolhida: Dinheiro | null;
  readonly pago: boolean;
  readonly hospedagem: boolean;
  readonly anamnese: StatusAnamnese;
  readonly pontoDeAtencao: string | null;
}

/* ---------------------------------------------------------------------------
   Inscrição — Doc 2 §2.4 e Doc 4, E-06.

   O que a v2.2 do domínio chamava de `TabelaDeContribuicao` com `valorBase`
   virou outra coisa depois da decisão da coordenação: **três níveis sugeridos**
   — social, sustentável e próspero —, definidos pelos padrinhos e referentes
   só à participação na cerimônia. Não são preço: são sugestão. Pode-se pagar
   menos, conversado, e pode-se pagar mais por vontade própria. Por isso
   `permiteValorLivre` deixa de ser opção de quem cria o evento e passa a ser a
   natureza do regime de contribuição.
   --------------------------------------------------------------------------- */

/**
 * Link de inscrição — um por cerimônia, gerado quando a cerimônia é criada e
 * enviado pela recepção (na prática, por WhatsApp). É por ele que a pessoa se
 * cadastra e responde a própria anamnese.
 *
 * O token é do evento, não da pessoa: o mesmo link serve para todo mundo, e
 * quem identifica a pessoa é o CPF que ela declara ao abrir.
 */
export interface LinkDeInscricao {
  readonly eventoId: EventoId;
  readonly token: string;
  readonly url: string;
  readonly criadoEm: DataLocal;
  readonly inscricoesAbertas: boolean;
  readonly aberturas: number;
  readonly inscricoesPeloLink: number;
}

export type NivelDeContribuicao = 'SOCIAL' | 'SUSTENTAVEL' | 'PROSPERO';

export interface ContribuicaoSugerida {
  readonly nivel: NivelDeContribuicao;
  readonly rotulo: string;
  readonly valor: Dinheiro;
  readonly explicacao: string;
}

export type ModalidadeCrianca = 'PARTICIPA_RITUAL' | 'PERMANECE_SOB_SUPERVISAO';
export type StatusAcolhimento = 'NAO_NECESSARIO' | 'PENDENTE' | 'REALIZADO';

/**
 * `COLCHONETE` é grátis e, por decisão da casa, não gera cobrança nem linha
 * financeira — mas existe no domínio porque a operação precisa saber quem
 * dorme na igreja para contar gente e não para contar dinheiro.
 */
export type Hospedagem = 'SEM_HOSPEDAGEM' | 'COLCHONETE' | 'BELICHE' | 'QUARTO';

export type Refeicao = 'CEIA' | 'CAFE' | 'ALMOCO' | 'JANTAR';

export interface OpcaoDeHospedagem {
  readonly tipo: Hospedagem;
  readonly rotulo: string;
  readonly valorDiaria: Dinheiro;
  readonly nota: string;
  /** Ocupa vaga no mapa de leitos e por isso pede alocação antes de confirmar. */
  readonly ocupaLeito: boolean;
}

export interface OpcaoDeRefeicao {
  readonly refeicao: Refeicao;
  readonly rotulo: string;
  readonly valor: Dinheiro;
}

/* ---------------------------------------------------------------------------
   Leitos — Doc 2 §2.6 e Doc 4, E-10/E-15.

   O cadastro (`Dormitorio`) vive fora do evento; o mapa (`AlocacaoDeLeito`)
   vive dentro dele. A fronteira transacional é o evento, e é justamente daí
   que vem a limitação assumida: conflito entre **eventos simultâneos no mesmo
   local** não é invariante, é aviso. A tela precisa desenhar esse aviso com
   clareza, porque o domínio não o impede.
   --------------------------------------------------------------------------- */

export type TipoLeito = 'BELICHE_SUPERIOR' | 'BELICHE_INFERIOR' | 'CAMA_SOLTEIRO' | 'QUARTO_PRIVATIVO';

export interface Leito {
  readonly id: LeitoId;
  readonly identificacao: string;
  readonly tipo: TipoLeito;
  readonly ativo: boolean;
}

export interface Dormitorio {
  readonly id: DormitorioId;
  readonly unidadeId: UnidadeId;
  readonly nome: string;
  readonly leitos: readonly Leito[];
  readonly ativo: boolean;
}

export interface AlocacaoDeLeito {
  readonly inscricaoId: InscricaoId;
  readonly leitoId: LeitoId;
  /** ML4: contido no intervalo do evento. */
  readonly noites: readonly DataLocal[];
}

/* ---------------------------------------------------------------------------
   Devolução — Doc 2 §2.9 e Doc 4, E-08/E-09.

   Dois atos, duas permissões, duas telas (DV3): o Acolhimento registra que a
   pessoa **pediu** o dinheiro de volta; a Tesouraria **paga**. Não é burocracia
   — é a fronteira "sem acesso a saídas financeiras do evento" expressa como
   desenho, e não como aviso.

   Cancelar não devolve (DV1). Quem falta e não pede, não recebe.
   --------------------------------------------------------------------------- */

export type StatusDevolucao = 'PENDENTE' | 'PAGA' | 'CANCELADA';

export interface DevolucaoDevida {
  readonly id: DevolucaoId;
  /** Nulo quando é devolução a contratante, não a participante (CN4). */
  readonly inscricaoId: InscricaoId | null;
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  /** DV2: integral, igual ao efetivamente pago. Exibido, nunca editável. */
  readonly valor: Dinheiro;
  readonly solicitadaEm: DataLocal;
  readonly solicitadaPor: string;
  readonly motivo: string;
  readonly status: StatusDevolucao;
  readonly pagaEm: DataLocal | null;
  readonly contaId: ContaId | null;
}

/** Lista de preparo do trabalho — compartilhável por link e atualizável por webhook. */
export type OrigemMarcacao = 'SISTEMA' | 'LINK_PUBLICO' | 'WEBHOOK';

export interface TarefaDePreparo {
  readonly id: TarefaId;
  readonly eventoId: EventoId;
  readonly texto: string;
  readonly responsavel: string;
  readonly feita: boolean;
  readonly feitaEm: DataLocal | null;
  readonly origemMarcacao: OrigemMarcacao | null;
}

export interface ResumoFinanceiroDoEvento {
  readonly eventoId: EventoId;
  readonly custoPrevisto: Dinheiro;
  readonly custoLancado: Dinheiro;
  readonly contribuicoesEsperadas: Dinheiro;
  readonly contribuicoesRecebidas: Dinheiro;
  readonly resultado: Dinheiro;
  readonly pontoDeEquilibrio: number;
}
