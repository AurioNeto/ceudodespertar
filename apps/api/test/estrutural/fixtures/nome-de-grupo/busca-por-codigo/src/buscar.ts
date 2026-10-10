import type { CodigoGrupo } from '@cdd/contracts';

export interface Leitor {
  doSistema(codigo: CodigoGrupo): Promise<string | undefined>;
}

export function buscar(leitor: Leitor): Promise<string | undefined> {
  return leitor.doSistema('LEITURA');
}
