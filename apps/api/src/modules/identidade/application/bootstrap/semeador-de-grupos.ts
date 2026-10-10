export abstract class SemeadorDeGrupos {
  abstract semear(instituicaoId: string): Promise<void>;
}
