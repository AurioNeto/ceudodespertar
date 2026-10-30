import type { ContaId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import type { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import type { RepositorioDeConta } from '../../domain/conta/conta.repo.js';

interface ReferenciasDoFundo {
  readonly contaVinculadaId: ContaId;
  readonly categoriasPermitidas: readonly string[];
}

export async function conferirReferenciasDoFundo(
  contas: RepositorioDeConta,
  categorias: RepositorioDeCategoria,
  { contaVinculadaId, categoriasPermitidas }: ReferenciasDoFundo,
  { exigirAtiva }: { readonly exigirAtiva: boolean } = { exigirAtiva: true },
): Promise<Result<void, ErroDeDominio>> {
  const conta = await contas.porId(contaVinculadaId);
  if (conta === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO', { contaVinculadaId }));
  if (exigirAtiva && !conta.ativa) return err(erroDeDominio('CADASTRO_INATIVO', { contaVinculadaId }));

  if (categoriasPermitidas.length === 0) return ok();
  const codigosDaCasa = new Set((await categorias.listar()).map(({ codigoSistema }) => codigoSistema));
  const categoria = categoriasPermitidas.find((codigo) => !codigosDaCasa.has(codigo));
  if (categoria !== undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO', { categoria }));
  return ok();
}
