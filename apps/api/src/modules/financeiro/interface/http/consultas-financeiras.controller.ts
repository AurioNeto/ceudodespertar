import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  FiltroDaDre, FiltroDeListaFinanceira, FiltroDeResultadoFinanceiro, FiltroDeUnidadeFinanceira,
  FiltroDoFluxoDeCaixa, FiltroDeListaPorCompetencia, ParametrosDoEvento,
} from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { ConsultasDeCaixa, ConsultasDeResultado, ListasFinanceiras } from '../../application/consultas/consultas-financeiras.js';
import { ResultadoFinanceiroDaCerimonia } from '../../application/consultas/resultado-financeiro-da-cerimonia.js';

@Controller('financeiro')
export class ConsultasFinanceirasController {
  constructor(private readonly listas: ListasFinanceiras, private readonly caixa: ConsultasDeCaixa,
    private readonly resultados: ConsultasDeResultado, private readonly cerimonia: ResultadoFinanceiroDaCerimonia) {}

  @Get('meus-registros')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.ler_proprios')
  @ModoDeTransacao('leitura')
  meusRegistros(@ContextoAtual() acesso: ContextoDeAcesso,
    @Query({ schema: FiltroDeListaFinanceira }) filtro: FiltroDeListaFinanceira) {
    return this.listas.meusRegistros(filtro, acesso.usuarioId);
  }

  @Get('fila-conferencia')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.confirmar')
  @ModoDeTransacao('leitura')
  fila(@Query({ schema: FiltroDeListaFinanceira }) filtro: FiltroDeListaFinanceira) {
    return this.listas.fila(filtro);
  }

  @Get('lancamentos')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.lancamento.ler')
  @ModoDeTransacao('leitura')
  livro(@Query({ schema: FiltroDeListaPorCompetencia }) filtro: FiltroDeListaPorCompetencia) {
    return this.listas.livro(filtro);
  }

  @Get('contas/saldos')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.conta.ler')
  @ModoDeTransacao('leitura')
  contas(@Query({ schema: FiltroDeUnidadeFinanceira }) filtro: FiltroDeUnidadeFinanceira) {
    return this.caixa.contas(filtro);
  }

  @Get('fundos/saldos')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.conta.ler')
  @ModoDeTransacao('leitura')
  fundos(@Query({ schema: FiltroDeUnidadeFinanceira }) filtro: FiltroDeUnidadeFinanceira) {
    return this.caixa.fundos(filtro);
  }

  @Get('relatorios/dre')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.dre.ler')
  @ModoDeTransacao('leitura')
  dre(@Query({ schema: FiltroDaDre }) filtro: FiltroDaDre) {
    return this.resultados.dre(filtro);
  }

  @Get('relatorios/fluxo-de-caixa')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.fluxo_caixa.ler')
  @ModoDeTransacao('leitura')
  fluxo(@Query({ schema: FiltroDoFluxoDeCaixa }) filtro: FiltroDoFluxoDeCaixa) {
    return this.caixa.fluxo(filtro);
  }

  @Get('relatorios/grupos-de-custo')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.dre.ler')
  @ModoDeTransacao('leitura')
  porGrupo(@Query({ schema: FiltroDeResultadoFinanceiro }) filtro: FiltroDeResultadoFinanceiro) {
    return this.resultados.porGrupo(filtro);
  }

  @Get('relatorios/cerimonias')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.resultado_evento.ler')
  @ModoDeTransacao('leitura')
  cerimonias(@Query({ schema: FiltroDeListaPorCompetencia }) filtro: FiltroDeListaPorCompetencia) {
    return this.resultados.cerimonias(filtro);
  }

  @Get('relatorios/cerimonias/:id')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('financeiro.resultado_evento.ler')
  @ModoDeTransacao('leitura')
  porCerimonia(@Param({ schema: ParametrosDoEvento }) { id }: ParametrosDoEvento,
    @Query({ schema: FiltroDeResultadoFinanceiro }) filtro: FiltroDeResultadoFinanceiro) {
    return this.cerimonia.consultar(id, filtro);
  }
}
