import { ErroDeAmbienteDoBancoInvalido } from '../shared/infrastructure/banco/esquema-de-ambiente-do-banco.js';
import { ErroDeAmbienteInvalido } from '../shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { ErroDeDominioException } from '../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../shared/kernel/erro-de-dominio.js';
import type { Result } from '../shared/kernel/result.js';
import type { ComandoDeBootstrap, ResultadoDoBootstrap } from '../modules/identidade/public-api.js';
import type { EnviadorDeConvite } from '../modules/identidade/public-api.js';
import {
  CODIGO_DE_INFRAESTRUTURA,
  CODIGO_DE_REGRA,
  CODIGO_DE_SUCESSO,
  CODIGO_DE_USO_OU_VALIDACAO,
} from './codigos-de-saida.js';
import { analisarComandoDaIdentidade, ErroDeUsoDoCli, USO_DO_CLI } from './comando-cli.js';
import type { ComandoDaIdentidade } from './comando-cli.js';
import {
  linhasDeSucessoPorConvite,
  linhasDeSucessoPorVinculo,
  mensagemDeBootstrapGravadoSemConvite,
  mensagemDoCodigoDeErro,
} from './mensagens-do-cli.js';

export interface SaidaDoCli {
  readonly codigoDeSaida: number;
  readonly stdout: readonly string[];
  readonly stderr: readonly string[];
}

export interface DependenciasDoBootstrap {
  readonly bootstrap: { executar(comando: ComandoDeBootstrap): Promise<Result<ResultadoDoBootstrap, ErroDeDominio>> };
  readonly enviador: Pick<EnviadorDeConvite, 'enviar'>;
}

export interface ContextoDoCli {
  readonly dependencias: DependenciasDoBootstrap;
  encerrar(): Promise<void>;
}

export type AbrirContextoDoCli = () => Promise<ContextoDoCli>;

const FORMATO_DE_CODIGO_DE_SISTEMA = /^[A-Z0-9_]+$/;

function saida(codigoDeSaida: number, stdout: readonly string[], stderr: readonly string[] = []): SaidaDoCli {
  return { codigoDeSaida, stdout, stderr };
}

function nomeDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.name : 'erro desconhecido';
}

function codigoDeSistemaDo(erro: unknown): string | undefined {
  const codigo = (erro as { code?: unknown } | null)?.code;
  return typeof codigo === 'string' && FORMATO_DE_CODIGO_DE_SISTEMA.test(codigo) ? codigo : undefined;
}

function saidaDeRegraRecusada(erro: ErroDeDominio): SaidaDoCli {
  const codigoDeSaida =
    erro.codigo === 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL' ? CODIGO_DE_INFRAESTRUTURA : CODIGO_DE_REGRA;
  return saida(codigoDeSaida, [], [mensagemDoCodigoDeErro(erro.codigo)]);
}

function saidaDeFalhaInesperada(erro: unknown): SaidaDoCli {
  if (erro instanceof ErroDeUsoDoCli) return saida(CODIGO_DE_USO_OU_VALIDACAO, [], [...erro.problemas, USO_DO_CLI]);
  if (erro instanceof ErroDeDominioException) return saidaDeRegraRecusada(erro.erroDeDominio);
  if (erro instanceof RangeError) {
    return saida(CODIGO_DE_USO_OU_VALIDACAO, [], [`Entrada recusada pela validação do domínio: ${erro.message}`]);
  }
  if (erro instanceof ErroDeAmbienteInvalido || erro instanceof ErroDeAmbienteDoBancoInvalido) {
    return saida(CODIGO_DE_INFRAESTRUTURA, [], [erro.message]);
  }
  const codigo = codigoDeSistemaDo(erro);
  const detalhe = codigo === undefined ? nomeDoErro(erro) : `${nomeDoErro(erro)}, ${codigo}`;
  return saida(CODIGO_DE_INFRAESTRUTURA, [], [`Falha de infraestrutura inesperada (${detalhe}); nada foi impresso além do tipo para não expor dados sensíveis.`]);
}

export async function executarBootstrap(
  comando: ComandoDeBootstrap,
  { bootstrap, enviador }: DependenciasDoBootstrap,
): Promise<SaidaDoCli> {
  const resultado = await bootstrap.executar(comando);
  if (resultado.tipo === 'erro') return saidaDeRegraRecusada(resultado.erro);
  const { valor } = resultado;
  if (valor.modo === 'VINCULO') {
    return saida(CODIGO_DE_SUCESSO, linhasDeSucessoPorVinculo(valor.instituicaoId, valor.usuarioId));
  }
  try {
    await enviador.enviar(valor.convite);
  } catch (erro) {
    return saida(
      CODIGO_DE_INFRAESTRUTURA,
      [],
      mensagemDeBootstrapGravadoSemConvite(valor.instituicaoId, valor.usuarioId, nomeDoErro(erro)),
    );
  }
  return saida(
    CODIGO_DE_SUCESSO,
    linhasDeSucessoPorConvite(valor.instituicaoId, valor.usuarioId, valor.convite.email),
  );
}

async function executarSubcomando(comando: ComandoDaIdentidade, contexto: ContextoDoCli): Promise<SaidaDoCli> {
  return executarBootstrap(comando.bootstrap, contexto.dependencias);
}

async function encerrarSemPerderASaida(contexto: ContextoDoCli, saidaDoComando: SaidaDoCli): Promise<SaidaDoCli> {
  try {
    await contexto.encerrar();
    return saidaDoComando;
  } catch (erro) {
    const aviso = `Falha ao encerrar o contexto (${nomeDoErro(erro)}).`;
    const codigoDeSaida =
      saidaDoComando.codigoDeSaida === CODIGO_DE_SUCESSO ? CODIGO_DE_INFRAESTRUTURA : saidaDoComando.codigoDeSaida;
    return saida(codigoDeSaida, saidaDoComando.stdout, [...saidaDoComando.stderr, aviso]);
  }
}

export async function executarCli(argumentos: readonly string[], abrirContexto: AbrirContextoDoCli): Promise<SaidaDoCli> {
  let comando: ComandoDaIdentidade;
  try {
    comando = analisarComandoDaIdentidade(argumentos);
  } catch (erro) {
    return saidaDeFalhaInesperada(erro);
  }
  let contexto: ContextoDoCli;
  try {
    contexto = await abrirContexto();
  } catch (erro) {
    return saidaDeFalhaInesperada(erro);
  }
  const saidaDoComando = await executarSubcomando(comando, contexto).catch(saidaDeFalhaInesperada);
  return encerrarSemPerderASaida(contexto, saidaDoComando);
}
