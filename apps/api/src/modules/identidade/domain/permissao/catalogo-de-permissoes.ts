import { CATALOGO_DE_PERMISSOES, type Permissao } from '@cdd/contracts';

export function ehPermissaoDoCatalogo(valor: string): valor is Permissao {
  return Object.hasOwn(CATALOGO_DE_PERMISSOES, valor);
}
