import type {
  DemonstrativoDeResultado, EventoId, FiltroDaDre, FiltroDeListaFinanceira, FiltroDeResultadoFinanceiro,
  FiltroDeUnidadeFinanceira, FiltroDoFluxoDeCaixa, FiltroDeListaPorCompetencia, FluxoDeCaixa,
  MovimentoNaConsulta, MovimentoNaFila, PaginaFinanceira, RegistroProprioNaConsulta, ResumoDeResultadoDeCerimonia, ResultadoDeGrupo,
  SaldoDeConta, SaldoDeFundo, UsuarioId,
} from '@cdd/contracts';

export abstract class ListasFinanceiras {
  abstract meusRegistros(filtro: FiltroDeListaFinanceira, autor: UsuarioId): Promise<PaginaFinanceira<RegistroProprioNaConsulta>>;
  abstract fila(filtro: FiltroDeListaFinanceira): Promise<PaginaFinanceira<MovimentoNaFila>>;
  abstract livro(filtro: FiltroDeListaPorCompetencia): Promise<PaginaFinanceira<MovimentoNaConsulta>>;
}

export abstract class ConsultasDeCaixa {
  abstract contas(filtro: FiltroDeUnidadeFinanceira): Promise<readonly SaldoDeConta[]>;
  abstract fundos(filtro: FiltroDeUnidadeFinanceira): Promise<readonly SaldoDeFundo[]>;
  abstract fluxo(filtro: FiltroDoFluxoDeCaixa): Promise<FluxoDeCaixa>;
}

export abstract class ConsultasDeResultado {
  abstract dre(filtro: FiltroDaDre): Promise<DemonstrativoDeResultado>;
  abstract porEvento(eventoId: EventoId, filtro: FiltroDeResultadoFinanceiro): Promise<DemonstrativoDeResultado>;
  abstract cerimonias(filtro: FiltroDeListaPorCompetencia): Promise<PaginaFinanceira<ResumoDeResultadoDeCerimonia>>;
  abstract porGrupo(filtro: FiltroDeResultadoFinanceiro): Promise<readonly ResultadoDeGrupo[]>;
}
