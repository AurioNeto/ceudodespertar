import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaValidationPipeOptions } from '@nestjs/common';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';

type FabricaDeExcecaoPadrao = NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>;
type ProblemaDeValidacao = Parameters<FabricaDeExcecaoPadrao>[0][number];

const LIMITE_DE_PROBLEMAS_REPORTADOS = 20;

function caminhoDoProblema(problema: ProblemaDeValidacao): string {
  if (problema.path === undefined || problema.path.length === 0) return '';
  return problema.path
    .map((segmento) => String(typeof segmento === 'object' ? segmento.key : segmento))
    .join('.');
}

function detalhesDosProblemas(problemas: readonly ProblemaDeValidacao[]): Record<string, unknown> {
  return {
    problemas: problemas.slice(0, LIMITE_DE_PROBLEMAS_REPORTADOS).map((problema) => ({
      caminho: caminhoDoProblema(problema),
      mensagem: problema.message,
    })),
    total: problemas.length,
  };
}

@Injectable()
export class PipeDeValidacaoZod extends StandardSchemaValidationPipe {
  constructor() {
    super({
      exceptionFactory: (problemas) =>
        new ErroDeDominioException(erroDeDominio('CORPO_INVALIDO', detalhesDosProblemas(problemas))),
    });
  }
}
