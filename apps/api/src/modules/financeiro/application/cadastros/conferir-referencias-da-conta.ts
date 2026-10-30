import type { UnidadeId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import type { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';

export async function conferirReferenciasDaConta(
  unidades: RepositorioDeUnidade,
  unidadeId: UnidadeId | null,
  { exigirAtiva }: { readonly exigirAtiva: boolean } = { exigirAtiva: true },
): Promise<Result<void, ErroDeDominio>> {
  if (unidadeId === null) return ok();
  const unidade = await unidades.porId(unidadeId);
  if (unidade === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO', { unidadeId }));
  if (exigirAtiva && !unidade.ativa) return err(erroDeDominio('CADASTRO_INATIVO', { unidadeId }));
  return ok();
}
