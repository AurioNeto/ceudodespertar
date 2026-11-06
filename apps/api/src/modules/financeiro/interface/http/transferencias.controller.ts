import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Res } from '@nestjs/common';
import { RegistrarTransferencia, EditarTransferencia, ConfirmarTransferencia, EstornarTransferencia, ParametrosDaTransferencia } from '@cdd/contracts';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { OperacoesDeTransferencia } from '../../application/transferencias/operacoes-de-transferencia.js';

interface Resposta { setHeader(nome: string, valor: string): void; }

@Controller('financeiro/transferencias')
@RespostaSemCorpoNoReplay()
export class TransferenciasController {
  constructor(private readonly operacoes: OperacoesDeTransferencia) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.conta.ler', 'financeiro.transferencia.registrar')
  @ModoDeTransacao('leitura')
  obter(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaTransferencia }) { id }: ParametrosDaTransferencia) {
    return this.operacoes.obter(acesso, id);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.transferencia.registrar')
  @ModoDeTransacao('escrita')
  async registrar(@ContextoAtual() acesso: ContextoDeAcesso, @Body({ schema: RegistrarTransferencia }) dados: RegistrarTransferencia, @Res({ passthrough: true }) resposta: Resposta) {
    const r = await this.operacoes.registrar(acesso, dados);
    if (r.tipo === 'ok') resposta.setHeader('Location', `/api/v1/financeiro/transferencias/${r.valor.id}`);
    return r;
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.transferencia.registrar', 'financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  editar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaTransferencia }) { id }: ParametrosDaTransferencia, @IfMatch() versao: number, @Body({ schema: EditarTransferencia }) dados: EditarTransferencia) {
    return this.operacoes.editar(acesso, id, versao, dados);
  }

  @Post(':id/confirmar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  confirmar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaTransferencia }) { id }: ParametrosDaTransferencia, @IfMatch() versao: number, @Body({ schema: ConfirmarTransferencia }) _comando: ConfirmarTransferencia) {
    return this.operacoes.confirmar(acesso, id, versao);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.transferencia.registrar', 'financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  descartar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaTransferencia }) { id }: ParametrosDaTransferencia, @IfMatch() versao: number) {
    return this.operacoes.descartar(acesso, id, versao);
  }

  @Post(':id/estornar')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.estornar')
  @ModoDeTransacao('escrita')
  async estornar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaTransferencia }) { id }: ParametrosDaTransferencia, @IfMatch() versao: number, @Body({ schema: EstornarTransferencia }) comando: EstornarTransferencia, @Res({ passthrough: true }) resposta: Resposta) {
    const r = await this.operacoes.estornar(acesso, id, versao, comando.motivo);
    if (r.tipo === 'ok') resposta.setHeader('Location', `/api/v1/financeiro/transferencias/${r.valor.id}`);
    return r;
  }
}
