export class ErroDeConfiguracaoDeIdempotencia extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeConfiguracaoDeIdempotencia';
  }
}
