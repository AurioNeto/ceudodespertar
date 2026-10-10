import { err, ok } from '../../kernel/result.js';
import type { Result } from '../../kernel/result.js';

const AMBIENTES_QUE_PERMITEM_SEED_DEMO = ['local', 'ci'] as const;
const AMBIENTES_CONHECIDOS = ['local', 'ci', 'homologacao', 'producao'] as const;
const HOSTS_DE_LOOPBACK = ['localhost', '127.0.0.1', '[::1]'] as const;

export type RecusaDoSeedDemo =
  | 'AMBIENTE_AUSENTE'
  | 'AMBIENTE_INVALIDO'
  | 'AMBIENTE_NAO_PERMITE_SEED'
  | 'KEYCLOAK_FORA_DO_LOOPBACK'
  | 'BANCO_FORA_DO_LOOPBACK';

export interface EntradaDaGuardaDoSeedDemo {
  readonly ambiente: string | undefined;
  readonly urlDoKeycloak: string;
  readonly urlDoBanco: string;
}

function ehAmbienteConhecido(valor: string): boolean {
  return (AMBIENTES_CONHECIDOS as readonly string[]).includes(valor);
}

function ambientePermiteSeed(valor: string): boolean {
  return (AMBIENTES_QUE_PERMITEM_SEED_DEMO as readonly string[]).includes(valor);
}

function estaEmLoopback(url: string): boolean {
  const analisada = URL.parse(url);
  return analisada !== null && (HOSTS_DE_LOOPBACK as readonly string[]).includes(analisada.hostname);
}

export function ambientePermiteSeedDemo(entrada: EntradaDaGuardaDoSeedDemo): Result<void, RecusaDoSeedDemo> {
  if (entrada.ambiente === undefined) return err('AMBIENTE_AUSENTE');
  if (!ehAmbienteConhecido(entrada.ambiente)) return err('AMBIENTE_INVALIDO');
  if (!ambientePermiteSeed(entrada.ambiente)) return err('AMBIENTE_NAO_PERMITE_SEED');
  if (!estaEmLoopback(entrada.urlDoKeycloak)) return err('KEYCLOAK_FORA_DO_LOOPBACK');
  if (!estaEmLoopback(entrada.urlDoBanco)) return err('BANCO_FORA_DO_LOOPBACK');
  return ok();
}
