import { RequestMethod } from '@nestjs/common';
import type { MarcaDeAcesso } from '../../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import {
  METODOS_QUE_MUDAM_ESTADO,
  MODOS_GRAVAVEIS,
} from '../../../src/shared/infrastructure/http/verificador-de-modo-de-transacao-das-rotas.js';
import type { Descoberta, Rota } from './descobrir-rotas.js';

export type RegraDeRota = 'marca-ausente-ou-duplicada' | 'escrita-sem-permissao' | 'usuario-ativo-fora-do-eu' | 'sem-permissao-fora-da-tabela' | 'descoberta-insuficiente';

export interface Violacao {
  readonly regra: RegraDeRota;
  readonly alvo: string;
}

export interface RotaSemPermissao {
  readonly marca: MarcaDeAcesso['tipo'];
  readonly metodo: string;
  readonly caminho: string;
}

export interface OpcoesDeVerificacao {
  readonly rotasSemPermissao: readonly RotaSemPermissao[];
  readonly rotaDeUsuarioAtivo: string;
  readonly pisoDeRotas: number;
  readonly rotasObrigatorias: readonly string[];
}

const MARCAS_COM_PERMISSAO: ReadonlySet<MarcaDeAcesso['tipo']> = new Set(['permissao', 'alguma-permissao']);

function ehEscrita(rota: Rota): boolean {
  const metodo = RequestMethod[rota.metodoHttp as keyof typeof RequestMethod];
  return METODOS_QUE_MUDAM_ESTADO.has(metodo) || MODOS_GRAVAVEIS.has(rota.modo);
}

function constaNaTabela(rota: Rota, tipo: MarcaDeAcesso['tipo'], tabela: readonly RotaSemPermissao[]): boolean {
  return tabela.some(
    (entrada) => entrada.marca === tipo && entrada.metodo === rota.metodoHttp && entrada.caminho === rota.caminho,
  );
}

function violacoesDaRota(rota: Rota, opcoes: OpcoesDeVerificacao): Violacao[] {
  const [marca] = rota.marcas;
  if (rota.marcas.length !== 1 || marca === undefined) return [{ regra: 'marca-ausente-ou-duplicada', alvo: rota.id }];
  const exigePermissao = MARCAS_COM_PERMISSAO.has(marca.tipo);
  const naTabela = constaNaTabela(rota, marca.tipo, opcoes.rotasSemPermissao);
  const violacoes: Violacao[] = [];
  if (ehEscrita(rota) && !exigePermissao && !naTabela) violacoes.push({ regra: 'escrita-sem-permissao', alvo: rota.id });
  if (marca.tipo === 'apenas-usuario-ativo' && rota.id !== opcoes.rotaDeUsuarioAtivo) {
    violacoes.push({ regra: 'usuario-ativo-fora-do-eu', alvo: rota.id });
  }
  if (!exigePermissao && !naTabela) {
    violacoes.push({ regra: 'sem-permissao-fora-da-tabela', alvo: rota.id });
  }
  return violacoes;
}

function violacoesDeSentinela(descoberta: Descoberta, opcoes: OpcoesDeVerificacao): Violacao[] {
  const ids = new Set(descoberta.rotas.map((rota) => rota.id));
  const abaixoDoPiso: Violacao[] =
    descoberta.rotas.length < opcoes.pisoDeRotas ? [{ regra: 'descoberta-insuficiente', alvo: `rotas descobertas: ${descoberta.rotas.length}` }] : [];
  const ausentes = opcoes.rotasObrigatorias.filter((id) => !ids.has(id)).map((id) => ({ regra: 'descoberta-insuficiente' as const, alvo: `ausente: ${id}` }));
  const semRota = descoberta.classesSemRota.map((nome) => ({ regra: 'descoberta-insuficiente' as const, alvo: `sem rota: ${nome}` }));
  return [...abaixoDoPiso, ...ausentes, ...semRota];
}

export function verificarRotas(descoberta: Descoberta, opcoes: OpcoesDeVerificacao): Violacao[] {
  return [...descoberta.rotas.flatMap((rota) => violacoesDaRota(rota, opcoes)), ...violacoesDeSentinela(descoberta, opcoes)];
}
