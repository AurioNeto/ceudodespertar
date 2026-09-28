export interface EventoDeDominio<Dados = Record<string, unknown>> {
  readonly eventoId: string;
  readonly tipo: string;
  readonly ocorridoEm: Date;
  readonly agregadoTipo: string;
  readonly agregadoId: string;
  readonly dados: Dados;
}
