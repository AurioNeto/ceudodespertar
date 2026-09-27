import { z } from 'zod';

function ehUrlDePostgres(valor: string): boolean {
  try {
    const protocolo = new URL(valor).protocol;
    return protocolo === 'postgres:' || protocolo === 'postgresql:';
  } catch {
    return false;
  }
}

export const EsquemaDoAmbienteDoMigrador = z.object({
  BANCO_URL_MIGRACAO: z
    .string()
    .min(1, 'obrigatória para rodar o migrador')
    .refine(ehUrlDePostgres, 'precisa ser uma URL postgres:// ou postgresql://'),
});

export type AmbienteDoMigrador = z.infer<typeof EsquemaDoAmbienteDoMigrador>;

export class ErroDeAmbienteDoMigradorInvalido extends Error {
  constructor(readonly problemas: readonly string[]) {
    super(`Ambiente do migrador inválido:\n${problemas.join('\n')}`);
    this.name = 'ErroDeAmbienteDoMigradorInvalido';
  }
}

export function analisarAmbienteDoMigrador(bruto: NodeJS.ProcessEnv): AmbienteDoMigrador {
  const resultado = EsquemaDoAmbienteDoMigrador.safeParse(bruto);
  if (!resultado.success) {
    throw new ErroDeAmbienteDoMigradorInvalido(formatarProblemas(resultado.error));
  }
  return resultado.data;
}

function formatarProblemas(erro: z.ZodError): string[] {
  return erro.issues.map((problema) => {
    const caminho = problema.path.join('.') || '(raiz)';
    return `${caminho}: ${problema.message}`;
  });
}
