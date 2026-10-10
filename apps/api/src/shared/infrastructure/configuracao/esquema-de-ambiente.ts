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

const urlSegura = z.string().refine(ehUrlSeguraAceita, {
  message:
    'deve ser uma URL https, ou http apenas em localhost, na forma canônica, sem barra final, credenciais, query ou fragmento',
});

const identificadorSemEspacos = z.string().regex(/^[A-Za-z0-9._-]+$/, {
  message: 'deve conter só letras, dígitos, ponto, hífen ou sublinhado',
});

const audienciaOidc = z.string().regex(/^\S+$/, { message: 'deve ser um texto sem espaços em branco' });

function ehUrlSeguraAceita(valor: string): boolean {
  const url = URL.parse(valor);
  if (url === null) return false;
  const protocoloAceito = url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');
  const semAdornos = url.username === '' && url.password === '' && url.search === '' && url.hash === '';
  return protocoloAceito && semAdornos && ehFormaCanonica(url, valor);
}

function ehFormaCanonica(url: URL, valor: string): boolean {
  return url.href.replace(/\/$/, '') === valor;
}

export const EsquemaDeAmbiente = z.object({
  PORTA: z.coerce.number().int().min(1).max(65535).default(3000),
  ORIGENS_CORS: listaDeOrigens,
  LOG_NIVEL: z.enum(NIVEIS_DE_LOG).default('info'),
  TZ: z.string().min(1).default('UTC'),
  OIDC_EMISSOR: urlSegura,
  OIDC_AUDIENCIA: audienciaOidc,
  KEYCLOAK_URL_BASE: urlSegura,
  KEYCLOAK_REALM: identificadorSemEspacos,
  KEYCLOAK_ADMIN_CLIENT_ID: identificadorSemEspacos,
  CDD_KC_ADMIN_SEGREDO: z.string().min(1),
  APP_URL_BASE: urlSegura,
  KEYCLOAK_CLIENT_ID_DO_CONVITE: identificadorSemEspacos,
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
