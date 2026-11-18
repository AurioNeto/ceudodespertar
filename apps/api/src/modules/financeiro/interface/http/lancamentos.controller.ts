import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Res } from '@nestjs/common';
import { RegistrarLancamento, EditarLancamento, ConfirmarLancamento, EstornarLancamento, ParametrosDoLancamento } from '@cdd/contracts';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { OperacoesDeLancamento } from '../../application/lancamentos/operacoes-de-lancamento.js';

interface Resposta { setHeader(nome: string, valor: string): void; }

@Controller('financeiro/lancamentos')
@RespostaSemCorpoNoReplay()
export class LancamentosController {
  constructor(private readonly operacoes: OperacoesDeLancamento) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.lancamento.ler', 'financeiro.lancamento.ler_proprios')
  @ModoDeTransacao('leitura')
  obter(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento) {
    return this.operacoes.obter(acesso, id);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.registrar')
  @ModoDeTransacao('escrita')
  async registrar(@ContextoAtual() acesso: ContextoDeAcesso, @Body({ schema: RegistrarLancamento }) dados: RegistrarLancamento, @Res({ passthrough: true }) resposta: Resposta) {
    const r = await this.operacoes.registrar(acesso, dados);
    if (r.tipo === 'ok') resposta.setHeader('Location', `/api/v1/financeiro/lancamentos/${r.valor.id}`);
    return r;
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  editar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento, @IfMatch() versao: number, @Body({ schema: EditarLancamento }) dados: EditarLancamento) {
    return this.operacoes.editar(acesso, id, versao, dados);
  }

  @Post(':id/confirmar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  confirmar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento, @IfMatch() versao: number, @Body({ schema: ConfirmarLancamento }) comando: ConfirmarLancamento) {
    return this.operacoes.confirmar(acesso, id, versao, comando);
  }

  @Delete(':id')
  @RequerAlgumaPermissao('financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  descartar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento, @IfMatch() versao: number) {
    return this.operacoes.descartar(acesso, id, versao);
  }

  @Post(':id/estornar')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.estornar')
  @ModoDeTransacao('escrita')
  async estornar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento, @IfMatch() versao: number, @Body({ schema: EstornarLancamento }) comando: EstornarLancamento, @Res({ passthrough: true }) resposta: Resposta) {
    const r = await this.operacoes.estornar(acesso, id, versao, comando.motivo);
    if (r.tipo === 'ok') resposta.setHeader('Location', `/api/v1/financeiro/lancamentos/${r.valor.id}`);
    return r;
  }
}
