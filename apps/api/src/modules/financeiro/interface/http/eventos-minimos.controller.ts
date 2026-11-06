import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { CriarEventoMinimo, ParametrosDoEvento } from '@cdd/contracts';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { OperacoesDeEventoMinimo } from '../../application/cadastros/operacoes-de-evento-minimo.js';
import { informarLocalizacaoDoCriado, type RespostaComCabecalhos } from './localizacao-do-criado.js';

@Controller('financeiro/eventos')
@RespostaSemCorpoNoReplay()
export class EventosMinimosController {
  constructor(private readonly eventos: OperacoesDeEventoMinimo) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('eventos.evento.criar')
  @ModoDeTransacao('escrita')
  async criar(@Body({ schema: CriarEventoMinimo }) dados: CriarEventoMinimo,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos) {
    return informarLocalizacaoDoCriado(resposta, '/api/v1/financeiro/eventos', await this.eventos.criar(dados));
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('eventos.evento.criar', 'financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar',
    'financeiro.lancamento.ler', 'financeiro.resultado_evento.ler')
  @ModoDeTransacao('leitura')
  obter(@Param({ schema: ParametrosDoEvento }) { id }: ParametrosDoEvento) {
    return this.eventos.obter(id);
  }
}
