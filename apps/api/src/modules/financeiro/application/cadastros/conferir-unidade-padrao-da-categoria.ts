import type { UnidadeId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import type { Categoria } from '../../domain/categoria/categoria.js';
import type { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';

export async function conferirUnidadePadraoDaCategoria(
  unidades: RepositorioDeUnidade,
  categoria: Categoria,
  { exigirAtiva }: { readonly exigirAtiva: boolean } = { exigirAtiva: true },
): Promise<Result<void, ErroDeDominio>> {
  const unidadePadraoId: UnidadeId | null = categoria.unidadePadraoId;
  if (unidadePadraoId === null) return ok();

  const unidade = await unidades.porId(unidadePadraoId);
  if (unidade === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO', { unidadePadraoId }));
  if (exigirAtiva && !unidade.ativa) return err(erroDeDominio('CADASTRO_INATIVO', { unidadePadraoId }));
  return categoria.conferirUsoNoRegime(unidade.regime);
}
