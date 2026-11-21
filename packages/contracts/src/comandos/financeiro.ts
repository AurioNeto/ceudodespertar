import { z } from 'zod';
import {
  competenciaValida,
  dataLocalValida,
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
const TAMANHO_MINIMO_DO_MOTIVO_DE_REABERTURA = 10;
const MAXIMO_DE_ETIQUETAS = 20;
const MAXIMO_DE_CATEGORIAS_DO_FUNDO = 50;
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
  contaVinculadaId: uuidEmMinusculas<ContaId>(),
  nota: textoSemCaractereNulo().trim().max(TAMANHO_MAXIMO_DA_DESCRICAO).default(''),
  meta: opcional(dinheiroPositivo()),
  categoriasPermitidas: z.array(codigoDeSistema).max(MAXIMO_DE_CATEGORIAS_DO_FUNDO).refine(semRepeticao, SEM_DUPLICADOS),
});

export const CriarFundo = dadosDoFundo.extend({
  codigoSistema: codigoDeSistema,
});

export type CriarFundo = z.infer<typeof CriarFundo>;

export const EditarFundo = dadosDoFundo.extend({ ativo: z.boolean() });

export type EditarFundo = z.infer<typeof EditarFundo>;

const etiqueta = z.object({
  categoriaId: uuidEmMinusculas<CategoriaId>(),
  valor: dinheiroPositivo(),
});

const etiquetas = z
  .array(etiqueta)
  .max(MAXIMO_DE_ETIQUETAS)
  .refine((itens) => semRepeticao(itens.map(({ categoriaId }) => categoriaId)), SEM_DUPLICADOS);

export const DadosDoLancamento = z
  .object({
    natureza: z.enum(NATUREZAS),
    valor: dinheiroPositivo(),
    motivo,
    etiquetas: etiquetas.default([]),
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
    comprovanteId: opcional(uuidEmMinusculas<AnexoId>()),
  })
  .refine(({ pessoaId, contraparteTexto }) => pessoaId === null || contraparteTexto === null, {
    message: 'informe a pessoa cadastrada ou o texto da contraparte, não os dois',
    params: { regra: 'contraparte_unica' },
    path: ['contraparteTexto'],
  });

export type DadosDoLancamento = z.infer<typeof DadosDoLancamento>;

export const RegistrarLancamento = DadosDoLancamento;

export type RegistrarLancamento = DadosDoLancamento;

export const EditarLancamento = DadosDoLancamento;

export type EditarLancamento = DadosDoLancamento;

export const ConfirmarLancamento = z.object({
  etiquetas: etiquetas.optional(),
});

export type ConfirmarLancamento = z.infer<typeof ConfirmarLancamento>;

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
};

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
    motivo,
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
    if (dados.contaOrigemId !== null && dados.contaOrigemId === dados.contaDestinoId) {
      contexto.addIssue({
        code: 'custom',
        path: ['contaDestinoId'],
        message: 'origem e destino precisam ser contas diferentes',
        params: { regra: 'contas_iguais' },
      });
    }
  });

export type RegistrarTransferencia = z.infer<typeof RegistrarTransferencia>;

export const EditarTransferencia = RegistrarTransferencia;

export type EditarTransferencia = RegistrarTransferencia;

export const EstornarTransferencia = z.object({ motivo });

export type EstornarTransferencia = z.infer<typeof EstornarTransferencia>;

export const ParametrosDaTransferencia = z.object({ id: uuidEmMinusculas<TransferenciaId>() });

export type ParametrosDaTransferencia = z.infer<typeof ParametrosDaTransferencia>;

export const ParametrosDoPeriodo = z.object({
  unidadeId: uuidEmMinusculas<UnidadeId>(),
  competencia: competenciaValida(),
});

export type ParametrosDoPeriodo = z.infer<typeof ParametrosDoPeriodo>;

export const ReabrirPeriodo = z.object({
  motivo: textoSemCaractereNulo().trim().min(TAMANHO_MINIMO_DO_MOTIVO_DE_REABERTURA).max(TAMANHO_MAXIMO_DO_MOTIVO),
});

export type ReabrirPeriodo = z.infer<typeof ReabrirPeriodo>;
