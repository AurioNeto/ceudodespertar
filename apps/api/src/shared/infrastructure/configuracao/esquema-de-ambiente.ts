import { z } from 'zod';

const NIVEIS_DE_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

const listaDeOrigens = z
  .string()
  .default('')
  .transform((valor) =>
    valor
      .split(',')
      .map((origem) => origem.trim())
      .filter((origem) => origem.length > 0),
  );

export const EsquemaDeAmbiente = z.object({
  PORTA: z.coerce.number().int().positive().default(3000),
  ORIGENS_CORS: listaDeOrigens,
  LOG_NIVEL: z.enum(NIVEIS_DE_LOG).default('info'),
  TZ: z.string().min(1).default('America/Sao_Paulo'),
});

export type Ambiente = z.infer<typeof EsquemaDeAmbiente>;

export const AMBIENTE = Symbol('AMBIENTE');

export class ErroDeAmbienteInvalido extends Error {
  constructor(readonly problemas: readonly string[]) {
    super(`Ambiente inválido:\n${problemas.join('\n')}`);
    this.name = 'ErroDeAmbienteInvalido';
  }
}

export function analisarAmbiente(bruto: NodeJS.ProcessEnv): Ambiente {
  const resultado = EsquemaDeAmbiente.safeParse(bruto);
  if (!resultado.success) {
    throw new ErroDeAmbienteInvalido(formatarProblemas(resultado.error));
  }
  return resultado.data;
}

function formatarProblemas(erro: z.ZodError): string[] {
  return erro.issues.map((problema) => {
    const caminho = problema.path.join('.') || '(raiz)';
    return `${caminho}: ${problema.message}`;
  });
}
