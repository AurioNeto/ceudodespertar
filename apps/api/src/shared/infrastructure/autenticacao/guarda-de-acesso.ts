import { Injectable, Logger } from '@nestjs/common';
import type { CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { ResolvedorDeContextoDeAcesso } from './contexto-de-acesso.js';
import type { ContextoDeAcesso } from './contexto-de-acesso.js';
import { ErroDeChavesIndisponiveis } from './chaves-remotas.js';
import {
  erroDeConfiguracaoDeAcesso,
  naoAutenticado,
  provedorDeIdentidadeIndisponivel,
  semPermissao,
} from './erros-de-acesso.js';
import { lerMarcasProprias } from './marcas-de-acesso.js';
import type { MarcaDeAcesso } from './marcas-de-acesso.js';
import { guardarContexto, guardarIdentidade } from './requisicao-autenticada.js';
import type { RequisicaoHttp, RespostaHttp } from './requisicao-autenticada.js';
import { VerificadorDeToken } from './verificador-de-token.js';

const DESAFIO_DE_AUTENTICACAO = 'Bearer';
const FORMATO_DO_CABECALHO = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

const FORMATO_DO_MOTIVO = /^[A-Za-z0-9_]{1,64}$/;
const MOTIVO_DESCONHECIDO = 'ERRO_DESCONHECIDO';

type MarcaDePermissao = Extract<MarcaDeAcesso, { tipo: 'permissao' | 'alguma-permissao' }>;

@Injectable()
export class GuardaDeAcesso implements CanActivate {
  private readonly log = new Logger(GuardaDeAcesso.name);

  constructor(
    private readonly verificador: VerificadorDeToken,
    private readonly resolvedor: ResolvedorDeContextoDeAcesso,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const marca = this.marcaDaRota(contexto);
    if (marca.tipo === 'publico') return true;

    const requisicao = contexto.switchToHttp().getRequest<RequisicaoHttp>();
    const resposta = contexto.switchToHttp().getResponse<RespostaHttp>();

    const identidade = await this.autenticar(requisicao, resposta);
    guardarIdentidade(requisicao, identidade);
    if (marca.tipo === 'apenas-identificado') return true;

    const resultado = await this.resolvedor.resolver(identidade);
    if (resultado.recusada) {
      this.log.warn(`Acesso recusado pelo resolvedor: ${resultado.codigo}`);
      throw this.nao401(resposta, resultado.codigo);
    }
    guardarContexto(requisicao, resultado);
    if (marca.tipo === 'apenas-usuario-ativo') return true;
    if (!possuiPermissaoExigida(resultado, marca)) {
      this.log.warn('Acesso negado por falta de permissão');
      throw semPermissao();
    }
    return true;
  }

  private marcaDaRota(contexto: ExecutionContext): MarcaDeAcesso {
    const doMetodo = lerMarcasProprias(contexto.getHandler());
    const marcas = doMetodo.length > 0 ? doMetodo : lerMarcasProprias(contexto.getClass());
    const [unica] = marcas;
    if (marcas.length !== 1 || unica === undefined) {
      this.log.error(
        `Rota ${contexto.getClass().name}.${contexto.getHandler().name} com ${marcas.length} marcas de acesso; exige exatamente uma`,
      );
      throw erroDeConfiguracaoDeAcesso();
    }
    return unica;
  }

  private async autenticar(requisicao: RequisicaoHttp, resposta: RespostaHttp) {
    const token = extrairToken(requisicao);
    if (token === undefined) {
      this.log.warn('Requisição sem credencial Bearer válida no formato');
      throw this.nao401(resposta);
    }
    try {
      return await this.verificador.verificar(token);
    } catch (erro) {
      if (erro instanceof ErroDeChavesIndisponiveis) {
        this.log.error(`Provedor de identidade indisponível: ${descreverMotivo(erro.causa)}`);
        throw provedorDeIdentidadeIndisponivel();
      }
      this.log.warn(`Token recusado: ${descreverMotivo(erro)}`);
      throw this.nao401(resposta);
    }
  }

  private nao401(resposta: RespostaHttp, codigo?: Parameters<typeof naoAutenticado>[0]): HttpException {
    resposta.setHeader('WWW-Authenticate', DESAFIO_DE_AUTENTICACAO);
    return naoAutenticado(codigo);
  }
}

function extrairToken(requisicao: RequisicaoHttp): string | undefined {
  const cabecalho = requisicao.headers['authorization'];
  if (typeof cabecalho !== 'string') return undefined;
  return FORMATO_DO_CABECALHO.exec(cabecalho)?.[1];
}

function possuiPermissaoExigida(contexto: ContextoDeAcesso, marca: MarcaDePermissao): boolean {
  return marca.tipo === 'permissao'
    ? contexto.permissoes.has(marca.permissao)
    : marca.permissoes.some((permissao) => contexto.permissoes.has(permissao));
}

function descreverMotivo(erro: unknown): string {
  if (!(erro instanceof Error)) return MOTIVO_DESCONHECIDO;
  const { code } = erro as { code?: unknown };
  const candidato = typeof code === 'string' ? code : erro.name;
  return FORMATO_DO_MOTIVO.test(candidato) ? candidato : MOTIVO_DESCONHECIDO;
}
