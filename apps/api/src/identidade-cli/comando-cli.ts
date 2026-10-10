import { ConvidarUsuario } from '@cdd/contracts';
import { z } from 'zod';
import type { ComandoDeBootstrap } from '../modules/identidade/public-api.js';

const TAMANHO_MAXIMO_DO_NOME_DA_INSTITUICAO = 200;

interface DefinicaoDoSubcomando {
  readonly obrigatorias: readonly string[];
  readonly opcionais: readonly string[];
}

const DEFINICOES_DOS_SUBCOMANDOS = {
  bootstrap: {
    obrigatorias: ['instituicao-nome', 'admin-nome', 'admin-email'],
    opcionais: ['sujeito'],
  },
} as const satisfies Record<string, DefinicaoDoSubcomando>;

export type SubcomandoDaIdentidade = keyof typeof DEFINICOES_DOS_SUBCOMANDOS;

export const SUBCOMANDOS_DA_IDENTIDADE = Object.keys(DEFINICOES_DOS_SUBCOMANDOS) as SubcomandoDaIdentidade[];

export type ComandoDaIdentidade = { readonly subcomando: 'bootstrap'; readonly bootstrap: ComandoDeBootstrap };

export const USO_DO_CLI =
  'Uso: identidade-cli bootstrap --instituicao-nome <texto> --admin-nome <texto> --admin-email <e-mail> [--sujeito <sub>]';

export class ErroDeUsoDoCli extends Error {
  constructor(readonly problemas: readonly string[]) {
    super(problemas.join('\n'));
    this.name = 'ErroDeUsoDoCli';
  }
}

const nomeDaInstituicao = z.string().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME_DA_INSTITUICAO);
const sujeitoInformado = z.string().trim().min(1);

function ehSubcomando(valor: string | undefined): valor is SubcomandoDaIdentidade {
  return SUBCOMANDOS_DA_IDENTIDADE.some((subcomando) => subcomando === valor);
}

interface FlagLida {
  readonly nome: string;
  readonly valor: string;
  readonly consumidos: number;
}

function lerFlag(argumentos: readonly string[], posicao: number): FlagLida {
  const argumento = argumentos[posicao] as string;
  const posicaoDoIgual = argumento.indexOf('=');
  if (posicaoDoIgual !== -1) {
    return { nome: argumento.slice(2, posicaoDoIgual), valor: argumento.slice(posicaoDoIgual + 1), consumidos: 1 };
  }
  const proximo = argumentos[posicao + 1];
  const valorNoProximo = proximo !== undefined && !proximo.startsWith('--');
  return { nome: argumento.slice(2), valor: valorNoProximo ? proximo : '', consumidos: valorNoProximo ? 2 : 1 };
}

function problemaDaFlag(flag: FlagLida, permitidas: ReadonlySet<string>, lidas: ReadonlyMap<string, string>): string | undefined {
  if (!permitidas.has(flag.nome)) return `Flag desconhecida: --${flag.nome}.`;
  if (lidas.has(flag.nome)) return `Flag repetida: --${flag.nome}.`;
  if (flag.valor.trim() === '') return `Flag vazia: --${flag.nome}.`;
  return undefined;
}

function lerFlags(argumentos: readonly string[], definicao: DefinicaoDoSubcomando): Map<string, string> {
  const permitidas = new Set([...definicao.obrigatorias, ...definicao.opcionais]);
  const lidas = new Map<string, string>();
  const problemas: string[] = [];
  let posicao = 0;
  while (posicao < argumentos.length) {
    if (!(argumentos[posicao] as string).startsWith('--')) {
      problemas.push('Argumento posicional não é aceito; use flags explícitas.');
      posicao += 1;
      continue;
    }
    const flag = lerFlag(argumentos, posicao);
    posicao += flag.consumidos;
    const problema = problemaDaFlag(flag, permitidas, lidas);
    if (problema === undefined) lidas.set(flag.nome, flag.valor);
    else problemas.push(problema);
  }
  if (problemas.length > 0) throw new ErroDeUsoDoCli(problemas);
  return lidas;
}

function exigirFlags(lidas: Map<string, string>, definicao: DefinicaoDoSubcomando): void {
  const faltando = definicao.obrigatorias.filter((nome) => !lidas.has(nome));
  const problemas = faltando.map((nome) => `Flag obrigatória ausente: --${nome}.`);
  if (problemas.length > 0) throw new ErroDeUsoDoCli(problemas);
}

function analisarBootstrap(lidas: Map<string, string>): ComandoDeBootstrap {
  const problemas: string[] = [];
  const instituicao = nomeDaInstituicao.safeParse(lidas.get('instituicao-nome'));
  if (!instituicao.success) problemas.push('--instituicao-nome: informe um nome não vazio.');
  const administrador = ConvidarUsuario.safeParse({ nome: lidas.get('admin-nome'), email: lidas.get('admin-email') });
  if (!administrador.success) {
    const campos = new Set(administrador.error.issues.map((problema) => problema.path[0]));
    if (campos.has('nome')) problemas.push('--admin-nome: informe um nome não vazio.');
    if (campos.has('email')) problemas.push('--admin-email: informe um e-mail válido.');
  }
  const sujeito = lidas.has('sujeito') ? sujeitoInformado.safeParse(lidas.get('sujeito')) : undefined;
  if (sujeito !== undefined && !sujeito.success) problemas.push('--sujeito: informe um identificador não vazio.');
  if (problemas.length > 0 || !instituicao.success || !administrador.success) throw new ErroDeUsoDoCli(problemas);
  return {
    instituicaoNome: instituicao.data,
    adminNome: administrador.data.nome,
    adminEmail: administrador.data.email,
    ...(sujeito?.success ? { sujeito: sujeito.data } : {}),
  };
}

export function analisarComandoDaIdentidade(argumentos: readonly string[]): ComandoDaIdentidade {
  const [subcomando, ...restantes] = argumentos;
  if (!ehSubcomando(subcomando)) {
    throw new ErroDeUsoDoCli([`Subcomando ausente ou inválido. Use um destes: ${SUBCOMANDOS_DA_IDENTIDADE.join(', ')}.`]);
  }
  const definicao = DEFINICOES_DOS_SUBCOMANDOS[subcomando];
  const lidas = lerFlags(restantes, definicao);
  exigirFlags(lidas, definicao);
  return { subcomando, bootstrap: analisarBootstrap(lidas) };
}
