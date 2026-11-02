import { Body, Controller, Header, HttpCode, Param, Post } from '@nestjs/common';
import { AbrirPendencia, ResponderPendencia, ParametrosDaPendencia, ParametrosDoLancamento } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { ConversasDeLancamento } from '../../application/lancamentos/conversas-de-lancamento.js';

@Controller('financeiro/lancamentos')
@ModoDeTransacao('escrita')
@RespostaSemCorpoNoReplay()
export class PendenciasController {
  constructor(private readonly conversas: ConversasDeLancamento) {}

  @Post(':id/pendencias')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.confirmar')
  abrir(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento,
    @IfMatch() versao: number, @Body({ schema: AbrirPendencia }) { texto }: AbrirPendencia) {
    return this.conversas.abrir(acesso, id, versao, texto);
  }

  @Post(':id/pendencias/:pendenciaId/resposta')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar')
  responder(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDaPendencia }) { id, pendenciaId }: ParametrosDaPendencia,
    @IfMatch() versao: number, @Body({ schema: ResponderPendencia }) { texto }: ResponderPendencia) {
    return this.conversas.responder(acesso, id, pendenciaId, versao, texto);
  }
}
