import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, StandardSchemaValidationPipeOptions } from '@nestjs/common';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { detalhesDeCorpoInvalido } from '../../kernel/problemas-de-validacao.js';
import type { ProblemaDeValidacao, RegraDeValidacao } from '../../kernel/problemas-de-validacao.js';

type FabricaDeExcecaoPadrao = NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>;
type ProblemaDoSchema = Parameters<FabricaDeExcecaoPadrao>[0][number];
type SegmentoDoCaminho = NonNullable<ProblemaDoSchema['path']>[number];

const REGRA_POR_CODIGO_DO_ZOD: Readonly<Record<string, RegraDeValidacao>> = {
  too_small: 'minimo',
  too_big: 'maximo',
  invalid_format: 'formato',
  invalid_value: 'valor',
  invalid_union: 'formato',
  invalid_key: 'formato',
  invalid_element: 'formato',
  unrecognized_keys: 'campo_desconhecido',
  not_multiple_of: 'multiplo',
};
const REGRA_GENERICA: RegraDeValidacao = 'invalido';
const PADRAO_DE_REGRA_PROPRIA = /^[a-z][a-z_]{0,40}$/;
const PADRAO_DE_SEGMENTO_TECNICO = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const SEGMENTO_MASCARADO = '*';

function chaveDoSegmento(segmento: SegmentoDoCaminho): PropertyKey {
  return typeof segmento === 'object' ? segmento.key : segmento;
}

function segmentoSeguro(segmento: SegmentoDoCaminho): string {
  const chave = chaveDoSegmento(segmento);
  if (typeof chave === 'number') return String(chave);
  return typeof chave === 'string' && PADRAO_DE_SEGMENTO_TECNICO.test(chave) ? chave : SEGMENTO_MASCARADO;
}

function caminhoDoProblema(problema: ProblemaDoSchema): string {
  if (problema.path === undefined || problema.path.length === 0) return '';
  return problema.path.map(segmentoSeguro).join('.');
}

function valorNoCaminho(entrada: unknown, problema: ProblemaDoSchema): unknown {
  let atual = entrada;
  for (const segmento of problema.path ?? []) {
    if (atual === null || typeof atual !== 'object') return undefined;
    atual = (atual as Record<PropertyKey, unknown>)[chaveDoSegmento(segmento)];
  }
  return atual;
}

function regraPropria(problema: ProblemaDoSchema): RegraDeValidacao {
  const regra = (problema as { params?: { regra?: unknown } }).params?.regra;
  return typeof regra === 'string' && PADRAO_DE_REGRA_PROPRIA.test(regra) ? regra : REGRA_GENERICA;
}

function regraDoProblema(problema: ProblemaDoSchema, entrada: unknown): RegraDeValidacao {
  const codigo = (problema as { code?: unknown }).code;
  if (codigo === 'custom') return regraPropria(problema);
  if (codigo === 'invalid_type') return valorNoCaminho(entrada, problema) === undefined ? 'obrigatorio' : 'tipo';
  return typeof codigo === 'string' && Object.hasOwn(REGRA_POR_CODIGO_DO_ZOD, codigo)
    ? REGRA_POR_CODIGO_DO_ZOD[codigo]!
    : REGRA_GENERICA;
}

function paraProblemaDeValidacao(problema: ProblemaDoSchema, entrada: unknown): ProblemaDeValidacao {
  return { caminho: caminhoDoProblema(problema), regra: regraDoProblema(problema, entrada) };
}

class ProblemasDoSchema extends Error {
  constructor(readonly problemas: readonly ProblemaDoSchema[]) {
    super('corpo recusado pelo schema');
    this.name = 'ProblemasDoSchema';
  }
}

@Injectable()
export class PipeDeValidacaoZod extends StandardSchemaValidationPipe {
  constructor() {
    super({ exceptionFactory: (problemas) => new ProblemasDoSchema(problemas) });
  }

  override async transform<T = unknown>(valor: T, metadado: ArgumentMetadata): Promise<T> {
    try {
      return await super.transform(valor, metadado);
    } catch (excecao) {
      if (!(excecao instanceof ProblemasDoSchema)) throw excecao;
      const problemas = excecao.problemas.map((problema) => paraProblemaDeValidacao(problema, valor));
      throw new ErroDeDominioException(erroDeDominio('CORPO_INVALIDO', detalhesDeCorpoInvalido(problemas)));
    }
  }
}
