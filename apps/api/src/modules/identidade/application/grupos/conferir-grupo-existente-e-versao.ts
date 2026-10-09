import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, type Result } from '../../../../shared/kernel/result.js';
import type { Grupo } from '../../domain/grupo/grupo.js';
import { conferirVersao } from '../conferir-versao.js';

export function conferirGrupoExistenteEVersao(
  grupo: Grupo | undefined,
  versaoEsperada: number,
): Result<Grupo, ErroDeDominio> {
  if (grupo !== undefined) {
    const existente = grupo.conferirExistencia();
    if (existente.tipo === 'erro') return err(existente.erro);
  }
  return conferirVersao(grupo, versaoEsperada);
}
