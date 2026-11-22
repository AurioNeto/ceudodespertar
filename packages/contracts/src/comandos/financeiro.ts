import { z } from 'zod';
import {
  competenciaValida,
  dataLocalValida,
  dinheiroNaoNegativo,
  dinheiroPositivo,
  textoSemCaractereNulo,
  uuidEmMinusculas,
} from '../entrada.js';
import { FINALIDADES_DE_TRANSFERENCIA } from '../financeiro.js';
import type { FinalidadeTransferencia } from '../financeiro.js';
import type {
  AdiantamentoId,
  AnexoId,
  CategoriaId,
  ContaId,
  EmprestimoId,
  EventoId,
  FaturaId,
  FundoId,
  GrupoDeCustoId,
  LancamentoId,
  PessoaId,
  TransferenciaId,
  UnidadeId,
} from '../kernel.js';

const TAMANHO_MAXIMO_DO_CODIGO_DE_SISTEMA = 60;
const TAMANHO_MAXIMO_DO_NOME = 120;
const TAMANHO_MAXIMO_DA_DESCRICAO = 500;
const TAMANHO_MAXIMO_DO_MOTIVO = 500;
const TAMANHO_MAXIMO_DA_CONTRAPARTE = 200;
const TAMANHO_MAXIMO_DA_FORMA_DE_PAGAMENTO = 60;
const TAMANHO_MAXIMO_DO_IDENTIFICADOR_BANCARIO = 60;
const TAMANHO_MAXIMO_DO_RESPONSAVEL = 120;
const TAMANHO_MAXIMO_DO_NOME_DO_REEMBOLSADO = 200;
const TAMANHO_MAXIMO_DO_NOME_DO_ARQUIVO = 255;
const TAMANHO_MAXIMO_DO_TIPO_DO_ARQUIVO = 120;
const TAMANHO_MINIMO_DO_MOTIVO_DE_REABERTURA = 10;
const MAXIMO_DE_ETIQUETAS = 20;
const MAXIMO_DE_CATEGORIAS_DO_FUNDO = 50;
const MAXIMO_DE_PARCELAS = 20;
const FORMATO_DO_CODIGO_DE_SISTEMA = /^[A-Z][A-Z0-9_]*$/;

const NATUREZAS = ['RECEITA', 'DESPESA'] as const;
const REGIMES = ['CONTRIBUICAO', 'COMERCIAL'] as const;
const TIPOS_DE_CATEGORIA = ['OPERACIONAL', 'INVESTIMENTO', 'MANUTENCAO', 'PATRIMONIAL'] as const;
const TIPOS_DE_CONTA = ['CONTA_CORRENTE', 'CARTAO_CREDITO', 'DINHEIRO', 'FUNDO'] as const;
const TITULARIDADES = ['INSTITUCIONAL', 'PESSOAL_DE_TERCEIRO'] as const;

const codigoDeSistema = z.string().max(TAMANHO_MAXIMO_DO_CODIGO_DE_SISTEMA).regex(FORMATO_DO_CODIGO_DE_SISTEMA);
const nome = textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME);
const motivo = textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_MOTIVO);
const opcional = <T extends z.ZodType>(esquema: T) => esquema.nullable().default(null);

function semRepeticao<T>(itens: readonly T[]): boolean {
  return new Set(itens).size === itens.length;
}

const SEM_DUPLICADOS = { message: 'não pode conter itens duplicados', params: { regra: 'sem_duplicados' } };

export const ParametrosDoCadastro = z.object({
  id: uuidEmMinusculas(),
});

export type ParametrosDoCadastro = z.infer<typeof ParametrosDoCadastro>;

const dadosDaUnidade = z.object({
  nome,
  regime: z.enum(REGIMES),
  tetoAnual: opcional(dinheiroPositivo()),
});

const TETO_SO_NA_COMERCIAL = {
  message: 'tetoAnual só se aplica à unidade comercial',
  params: { regra: 'teto_so_na_comercial' },
  path: ['tetoAnual'],
};

const tetoSoNaComercial = ({ regime, tetoAnual }: { regime: string; tetoAnual: unknown }) =>
  regime === 'COMERCIAL' || tetoAnual === null;

export const CriarUnidade = dadosDaUnidade.extend({ codigoSistema: codigoDeSistema }).refine(tetoSoNaComercial, TETO_SO_NA_COMERCIAL);

export type CriarUnidade = z.infer<typeof CriarUnidade>;

export const EditarUnidade = dadosDaUnidade.extend({ ativa: z.boolean() }).refine(tetoSoNaComercial, TETO_SO_NA_COMERCIAL);

export type EditarUnidade = z.infer<typeof EditarUnidade>;

export const CriarGrupoDeCusto = z.object({ codigoSistema: codigoDeSistema, nome });

export type CriarGrupoDeCusto = z.infer<typeof CriarGrupoDeCusto>;

export const EditarGrupoDeCusto = z.object({ nome, ativo: z.boolean() });

export type EditarGrupoDeCusto = z.infer<typeof EditarGrupoDeCusto>;

const dadosDaCategoria = z.object({
  nome,
  regimesPermitidos: z.array(z.enum(REGIMES)).min(1).refine(semRepeticao, SEM_DUPLICADOS),
  unidadePadraoId: opcional(uuidEmMinusculas<UnidadeId>()),
  linhaRelatorio: nome,
});

export const CriarCategoria = dadosDaCategoria.extend({
  codigoSistema: codigoDeSistema,
  natureza: z.enum(NATUREZAS),
  tipo: z.enum(TIPOS_DE_CATEGORIA),
});

export type CriarCategoria = z.infer<typeof CriarCategoria>;

export const EditarCategoria = dadosDaCategoria.extend({ ativa: z.boolean() });

export type EditarCategoria = z.infer<typeof EditarCategoria>;

const dadosDaConta = z.object({
  nome,
  descricao: textoSemCaractereNulo().trim().max(TAMANHO_MAXIMO_DA_DESCRICAO).default(''),
  identificadorBancario: opcional(textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_IDENTIFICADOR_BANCARIO)),
  unidadeId: opcional(uuidEmMinusculas<UnidadeId>()),
  responsavel: textoSemCaractereNulo().trim().max(TAMANHO_MAXIMO_DO_RESPONSAVEL).default(''),
});

export const CriarConta = dadosDaConta
  .extend({
    tipo: z.enum(TIPOS_DE_CONTA),
    titularidade: z.enum(TITULARIDADES),
    pessoaTitularId: opcional(uuidEmMinusculas<PessoaId>()),
  })
  .refine(({ titularidade, pessoaTitularId }) => (titularidade === 'PESSOAL_DE_TERCEIRO') === (pessoaTitularId !== null), {
    message: 'conta pessoal de terceiro exige o titular, e só ela o aceita',
    params: { regra: 'titular_da_conta_pessoal' },
    path: ['pessoaTitularId'],
  });

export type CriarConta = z.infer<typeof CriarConta>;

export const EditarConta = dadosDaConta.extend({ ativa: z.boolean() });

export type EditarConta = z.infer<typeof EditarConta>;

const dadosDoFundo = z.object({
  nome,
  nota: textoSemCaractereNulo().trim().max(TAMANHO_MAXIMO_DA_DESCRICAO).default(''),
  meta: opcional(dinheiroPositivo()),
  categoriasPermitidas: z
    .array(codigoDeSistema)
    .max(MAXIMO_DE_CATEGORIAS_DO_FUNDO)
    .refine(semRepeticao, SEM_DUPLICADOS)
    .default([]),
  valorReservado: opcional(dinheiroNaoNegativo()),
});

export const CriarFundo = dadosDoFundo.extend({
  codigoSistema: opcional(codigoDeSistema),
  contaVinculadaId: opcional(uuidEmMinusculas<ContaId>()),
});

export type CriarFundo = z.infer<typeof CriarFundo>;

export const EditarFundo = dadosDoFundo.extend({
  contaVinculadaId: uuidEmMinusculas<ContaId>(),
  ativo: z.boolean(),
});

export type EditarFundo = z.infer<typeof EditarFundo>;

const etiquetaDoRegistro = z.object({
  categoriaId: uuidEmMinusculas<CategoriaId>(),
  valor: opcional(dinheiroPositivo()),
});

const etiquetaValorada = z.object({
  categoriaId: uuidEmMinusculas<CategoriaId>(),
  valor: dinheiroPositivo(),
});

const categoriasSemRepeticao = (itens: readonly { categoriaId: string }[]) =>
  semRepeticao(itens.map(({ categoriaId }) => categoriaId));

const etiquetasDoRegistro = z.array(etiquetaDoRegistro).max(MAXIMO_DE_ETIQUETAS).refine(categoriasSemRepeticao, SEM_DUPLICADOS);

const etiquetasValoradas = z.array(etiquetaValorada).max(MAXIMO_DE_ETIQUETAS).refine(categoriasSemRepeticao, SEM_DUPLICADOS);

const camposDoLancamento = z.object({
  natureza: z.enum(NATUREZAS),
  valor: dinheiroPositivo(),
  parcelas: opcional(z.array(dinheiroPositivo()).min(2).max(MAXIMO_DE_PARCELAS)),
  motivo: opcional(motivo),
  etiquetas: etiquetasDoRegistro.default([]),
  unidadeId: opcional(uuidEmMinusculas<UnidadeId>()),
  grupoDeCustoId: opcional(uuidEmMinusculas<GrupoDeCustoId>()),
  contaId: opcional(uuidEmMinusculas<ContaId>()),
  faturaId: opcional(uuidEmMinusculas<FaturaId>()),
  pessoaId: opcional(uuidEmMinusculas<PessoaId>()),
  contraparteTexto: opcional(textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DA_CONTRAPARTE)),
  formaPagamento: opcional(textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DA_FORMA_DE_PAGAMENTO)),
  eventoId: opcional(uuidEmMinusculas<EventoId>()),
  dataCompetencia: opcional(dataLocalValida()),
  dataCaixa: opcional(dataLocalValida()),
  reembolsoAId: opcional(uuidEmMinusculas<PessoaId>()),
  reembolsoATexto: opcional(textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME_DO_REEMBOLSADO)),
  comprovanteId: opcional(uuidEmMinusculas<AnexoId>()),
});

type CamposDoLancamento = z.infer<typeof camposDoLancamento>;

const somaDasParcelas = (parcelas: readonly number[]) => parcelas.reduce((total, parcela) => total + parcela, 0);

function conferirFormaDoLancamento(dados: CamposDoLancamento, contexto: z.RefinementCtx): void {
  if (dados.pessoaId !== null && dados.contraparteTexto !== null) {
    contexto.addIssue({
      code: 'custom',
      path: ['contraparteTexto'],
      message: 'informe a pessoa cadastrada ou o texto da contraparte, não os dois',
      params: { regra: 'contraparte_unica' },
    });
  }
  if (dados.reembolsoAId !== null && dados.reembolsoATexto !== null) {
    contexto.addIssue({
      code: 'custom',
      path: ['reembolsoATexto'],
      message: 'informe a pessoa cadastrada ou o nome de quem adiantou, não os dois',
      params: { regra: 'reembolsado_unico' },
    });
  }
  if (dados.parcelas !== null && somaDasParcelas(dados.parcelas) !== dados.valor) {
    contexto.addIssue({
      code: 'custom',
      path: ['parcelas'],
      message: 'a soma das parcelas precisa ser o valor do lançamento',
      params: { regra: 'parcelas_somam_o_valor' },
    });
  }
}

export const DadosDoLancamento = camposDoLancamento.superRefine(conferirFormaDoLancamento);

export type DadosDoLancamento = z.infer<typeof DadosDoLancamento>;

const etiquetaSemValor = ({ valor }: { valor: number | null }) => valor === null;

function conferirPedidoDeConfirmacao(dados: CamposDoLancamento & { confirmarNoRegistro: boolean }, contexto: z.RefinementCtx): void {
  if (!dados.confirmarNoRegistro) return;
  if (dados.etiquetas.length === 0 || dados.etiquetas.some(etiquetaSemValor)) {
    contexto.addIssue({
      code: 'custom',
      path: ['etiquetas'],
      message: 'registrar já confirmado exige etiquetas, todas com valor',
      params: { regra: 'confirmado_exige_etiquetas_com_valor' },
    });
  }
  if (dados.motivo === null) {
    contexto.addIssue({
      code: 'custom',
      path: ['motivo'],
      message: 'registrar já confirmado exige o motivo',
      params: { regra: 'confirmado_exige_motivo' },
    });
  }
  if (dados.parcelas !== null) {
    contexto.addIssue({
      code: 'custom',
      path: ['parcelas'],
      message: 'valor composto vira pendência na conferência e não nasce confirmado',
      params: { regra: 'composto_nao_nasce_confirmado' },
    });
  }
}

export const RegistrarLancamento = camposDoLancamento
  .extend({ confirmarNoRegistro: z.boolean().default(false) })
  .superRefine((dados, contexto) => {
    conferirFormaDoLancamento(dados, contexto);
    conferirPedidoDeConfirmacao(dados, contexto);
  });

export type RegistrarLancamento = z.infer<typeof RegistrarLancamento>;

export const EditarLancamento = DadosDoLancamento;

export type EditarLancamento = DadosDoLancamento;

export const ConfirmarLancamento = z.object({
  etiquetas: etiquetasValoradas.optional(),
});

export type ConfirmarLancamento = z.infer<typeof ConfirmarLancamento>;

export const DevolverLancamento = z.object({ motivo });

export type DevolverLancamento = z.infer<typeof DevolverLancamento>;

export const EstornarLancamento = z.object({ motivo });

export type EstornarLancamento = z.infer<typeof EstornarLancamento>;

export const AbrirPendencia = z.object({ texto: motivo });

export type AbrirPendencia = z.infer<typeof AbrirPendencia>;

export const ResponderPendencia = z.object({ texto: motivo });

export type ResponderPendencia = z.infer<typeof ResponderPendencia>;

export const ParametrosDoLancamento = z.object({ id: uuidEmMinusculas<LancamentoId>() });

export type ParametrosDoLancamento = z.infer<typeof ParametrosDoLancamento>;

type ReferenciaDaFinalidade = 'fundoId' | 'faturaId' | 'emprestimoId' | 'adiantamentoId' | 'unidadeDestinoId';

const REFERENCIA_POR_FINALIDADE: Readonly<Record<FinalidadeTransferencia, ReferenciaDaFinalidade | null>> = {
  MOVIMENTACAO_SIMPLES: null,
  APORTE_A_FUNDO: 'fundoId',
  PAGAMENTO_DE_FATURA: 'faturaId',
  RESSARCIMENTO_DE_ADIANTAMENTO: 'adiantamentoId',
  CONCESSAO_DE_EMPRESTIMO: 'emprestimoId',
  DEVOLUCAO_DE_EMPRESTIMO: 'emprestimoId',
  REPASSE_ENTRE_UNIDADES: 'unidadeDestinoId',
  RESGATE_DE_FUNDO: 'fundoId',
};

const FINALIDADES_DENTRO_DA_CONTA: ReadonlySet<FinalidadeTransferencia> = new Set(['APORTE_A_FUNDO', 'RESGATE_DE_FUNDO']);

const REFERENCIAS_DA_FINALIDADE: readonly ReferenciaDaFinalidade[] = [
  'fundoId',
  'faturaId',
  'emprestimoId',
  'adiantamentoId',
  'unidadeDestinoId',
];

export const RegistrarTransferencia = z
  .object({
    finalidade: z.enum(FINALIDADES_DE_TRANSFERENCIA),
    valor: dinheiroPositivo(),
    data: dataLocalValida(),
    contaOrigemId: opcional(uuidEmMinusculas<ContaId>()),
    contaDestinoId: opcional(uuidEmMinusculas<ContaId>()),
    unidadeId: uuidEmMinusculas<UnidadeId>(),
    unidadeDestinoId: opcional(uuidEmMinusculas<UnidadeId>()),
    fundoId: opcional(uuidEmMinusculas<FundoId>()),
    faturaId: opcional(uuidEmMinusculas<FaturaId>()),
    emprestimoId: opcional(uuidEmMinusculas<EmprestimoId>()),
    adiantamentoId: opcional(uuidEmMinusculas<AdiantamentoId>()),
    motivo: opcional(motivo),
    comprovanteId: opcional(uuidEmMinusculas<AnexoId>()),
  })
  .superRefine((dados, contexto) => {
    const exigida = REFERENCIA_POR_FINALIDADE[dados.finalidade];
    for (const referencia of REFERENCIAS_DA_FINALIDADE) {
      if ((referencia === exigida) !== (dados[referencia] !== null)) {
        contexto.addIssue({
          code: 'custom',
          path: [referencia],
          message: 'a finalidade define qual referência a transferência carrega',
          params: { regra: 'referencia_da_finalidade' },
        });
      }
    }
    const ehEmprestimo = REFERENCIA_POR_FINALIDADE[dados.finalidade] === 'emprestimoId';
    const contasInformadas = [dados.contaOrigemId, dados.contaDestinoId].filter((conta) => conta !== null).length;
    if (contasInformadas < (ehEmprestimo ? 1 : 2)) {
      contexto.addIssue({
        code: 'custom',
        path: [dados.contaOrigemId === null ? 'contaOrigemId' : 'contaDestinoId'],
        message: 'só o empréstimo admite uma das contas fora do sistema',
        params: { regra: 'contas_da_transferencia' },
      });
    }
    const dentroDaConta = FINALIDADES_DENTRO_DA_CONTA.has(dados.finalidade);
    if (!dentroDaConta && dados.contaOrigemId !== null && dados.contaOrigemId === dados.contaDestinoId) {
      contexto.addIssue({
        code: 'custom',
        path: ['contaDestinoId'],
        message: 'origem e destino precisam ser contas diferentes, salvo na reserva do fundo',
        params: { regra: 'contas_iguais' },
      });
    }
  });

export type RegistrarTransferencia = z.infer<typeof RegistrarTransferencia>;

export const EditarTransferencia = RegistrarTransferencia;

export type EditarTransferencia = RegistrarTransferencia;

export const ConfirmarTransferencia = z.object({});

export type ConfirmarTransferencia = z.infer<typeof ConfirmarTransferencia>;

export const EstornarTransferencia = z.object({ motivo });

export type EstornarTransferencia = z.infer<typeof EstornarTransferencia>;

export const ParametrosDaTransferencia = z.object({ id: uuidEmMinusculas<TransferenciaId>() });

export type ParametrosDaTransferencia = z.infer<typeof ParametrosDaTransferencia>;

export const ParametrosDaCompetencia = z.object({
  competencia: competenciaValida(),
});

export type ParametrosDaCompetencia = z.infer<typeof ParametrosDaCompetencia>;

export const ReabrirPeriodo = z.object({
  motivo: textoSemCaractereNulo().trim().min(TAMANHO_MINIMO_DO_MOTIVO_DE_REABERTURA).max(TAMANHO_MAXIMO_DO_MOTIVO),
});

export type ReabrirPeriodo = z.infer<typeof ReabrirPeriodo>;

export const EnviarAnexo = z.object({
  nome: textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME_DO_ARQUIVO),
  tipo: textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_TIPO_DO_ARQUIVO),
  tamanhoBytes: z.number().int().positive(),
});

export type EnviarAnexo = z.infer<typeof EnviarAnexo>;
