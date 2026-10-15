export abstract class SemeadorDaInstituicao {
  abstract semear(instituicaoId: string): Promise<void>;
}
