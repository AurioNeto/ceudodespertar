import { z } from 'zod';

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

export const EsquemaDoAmbienteDoBanco = z.object({
  BANCO_URL: z
    .string()
    .min(1, 'obrigatória para a aplicação conectar ao banco')
    .superRefine((valor, ctx) => {
      const url = analisarUrl(valor);
      if (!url || !ehProtocoloDePostgres(url)) {
        ctx.addIssue({ code: 'custom', message: 'precisa ser uma URL postgres:// ou postgresql://' });
      }
    }),
  BANCO_POOL_MAXIMO: z.coerce.number().int().min(1),
});

export type AmbienteDoBanco = z.infer<typeof EsquemaDoAmbienteDoBanco>;

export class ErroDeAmbienteDoBancoInvalido extends Error {
  constructor(readonly problemas: readonly string[]) {
    super(`Ambiente do banco inválido:\n${problemas.join('\n')}`);
    this.name = 'ErroDeAmbienteDoBancoInvalido';
  }
}

export function analisarAmbienteDoBanco(bruto: NodeJS.ProcessEnv): AmbienteDoBanco {
  const resultado = EsquemaDoAmbienteDoBanco.safeParse(bruto);
  if (!resultado.success) {
    throw new ErroDeAmbienteDoBancoInvalido(formatarProblemas(resultado.error));
  }
  return resultado.data;
}

function formatarProblemas(erro: z.ZodError): string[] {
  return erro.issues.map((problema) => {
    const caminho = problema.path.join('.') || '(raiz)';
    return `${caminho}: ${problema.message}`;
  });
}
