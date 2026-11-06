import { Body, Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
import { ParametrosDoPeriodo, ReabrirPeriodo, FecharPeriodo } from '@cdd/contracts';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { OperacoesDePeriodo } from '../../application/periodos/operacoes-de-periodo.js';

@Controller('financeiro/periodos/:unidadeId/:competencia')
@RespostaSemCorpoNoReplay()
export class PeriodosController {
  constructor(private readonly operacoes: OperacoesDePeriodo) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.periodo.fechar', 'financeiro.periodo.reabrir')
  @ModoDeTransacao('leitura')
  obter(@Param({ schema: ParametrosDoPeriodo }) chave: ParametrosDoPeriodo) { return this.operacoes.obter(chave); }
  @Get('integridade')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.periodo.fechar', 'financeiro.periodo.reabrir')
  @ModoDeTransacao('leitura')
  verificar(@Param({ schema: ParametrosDoPeriodo }) chave: ParametrosDoPeriodo) { return this.operacoes.verificar(chave); }
  @Post('fechar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.periodo.fechar')
  @ModoDeTransacao('escrita')
  fechar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoPeriodo }) chave: ParametrosDoPeriodo,
    @IfMatch() versao: number, @Body({ schema: FecharPeriodo }) _comando: FecharPeriodo) { return this.operacoes.fechar(acesso, chave, versao); }
  @Post('reabrir')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.periodo.reabrir')
  @ModoDeTransacao('escrita')
  reabrir(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoPeriodo }) chave: ParametrosDoPeriodo,
    @IfMatch() versao: number, @Body({ schema: ReabrirPeriodo }) comando: ReabrirPeriodo) { return this.operacoes.reabrir(acesso, chave, versao, comando.motivo); }
}
