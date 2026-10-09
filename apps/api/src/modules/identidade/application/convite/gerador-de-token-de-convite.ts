export interface TokenDeConvite {
  readonly token: string;
  readonly hash: string;
}

export abstract class GeradorDeTokenDeConvite {
  abstract gerar(): TokenDeConvite;
}
