import { z } from 'zod';

const PREFIXO_VARIAVEL_MIKRO_ORM = 'MIKRO_ORM_';

function analisarUrl(valor: string): URL | undefined {
  try {
    return new URL(valor);
  } catch {
    return undefined;
  }
}

function ehProtocoloDePostgres(url: URL): boolean {
  return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
}

export const EsquemaDoAmbienteDoMigrador = z.object({
  BANCO_URL_MIGRACAO: z
    .string()
    .min(1, 'obrigatória para rodar o migrador')
    .superRefine((valor, ctx) => {
      const url = analisarUrl(valor);
      if (!url || !ehProtocoloDePostgres(url)) {
        ctx.addIssue({ code: 'custom', message: 'precisa ser uma URL postgres:// ou postgresql://' });
        return;
      }
      if (url.search !== '' || url.hash !== '') {
        ctx.addIssue({
          code: 'custom',
          message:
            'não pode ter query string nem fragmento — parâmetros implícitos na URL (ex.: ?schema=) não são aceitos',
        });
      }
    }),
});

export type AmbienteDoMigrador = z.infer<typeof EsquemaDoAmbienteDoMigrador>;

export class ErroDeAmbienteDoMigradorInvalido extends Error {
  constructor(readonly problemas: readonly string[]) {
    super(`Ambiente do migrador inválido:\n${problemas.join('\n')}`);
    this.name = 'ErroDeAmbienteDoMigradorInvalido';
  }
}

function variaveisMikroOrmNoAmbiente(bruto: NodeJS.ProcessEnv): string[] {
  return Object.keys(bruto)
    .filter((chave) => chave.startsWith(PREFIXO_VARIAVEL_MIKRO_ORM) && bruto[chave] !== undefined)
    .sort();
}

export function analisarAmbienteDoMigrador(bruto: NodeJS.ProcessEnv): AmbienteDoMigrador {
  const resultado = EsquemaDoAmbienteDoMigrador.safeParse(bruto);
  const variaveisMikroOrm = variaveisMikroOrmNoAmbiente(bruto);

  if (!resultado.success || variaveisMikroOrm.length > 0) {
    const problemas = [
      ...(resultado.success ? [] : formatarProblemas(resultado.error)),
      ...(variaveisMikroOrm.length > 0
        ? [
            `ambiente contém variável(is) MIKRO_ORM_* que o migrador recusa, para não misturar configuração ` +
              `implícita do driver com o destino declarado em BANCO_URL_MIGRACAO: ${variaveisMikroOrm.join(', ')}`,
          ]
        : []),
    ];
    throw new ErroDeAmbienteDoMigradorInvalido(problemas);
  }

  return resultado.data;
}

function formatarProblemas(erro: z.ZodError): string[] {
  return erro.issues.map((problema) => {
    const caminho = problema.path.join('.') || '(raiz)';
    return `${caminho}: ${problema.message}`;
  });
}
