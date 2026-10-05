import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import type { PermissoesEfetivas } from '../permissao/permissoes-efetivas.js';
import type { Usuario } from '../usuario/usuario.js';

const PERMISSAO_DE_ADMINISTRADOR: Permissao = 'sistema.usuario.gerenciar';

export interface UsuarioDaInstituicao {
  readonly id: UsuarioId;
  readonly situacao: SituacaoUsuario;
  readonly permissoesEfetivas: ReadonlySet<Permissao>;
}

export const UsuarioDaInstituicao = {
  de(usuario: Usuario, permissoesEfetivas: PermissoesEfetivas): UsuarioDaInstituicao {
    return { id: usuario.id, situacao: usuario.situacao, permissoesEfetivas: new Set(permissoesEfetivas.lista) };
  },
};

function ehAdministradorAtivo(usuario: UsuarioDaInstituicao): boolean {
  return usuario.situacao === 'ATIVO' && usuario.permissoesEfetivas.has(PERMISSAO_DE_ADMINISTRADOR);
}

function idsDosAdministradoresAtivos(instituicao: readonly UsuarioDaInstituicao[]): Set<UsuarioId> {
  const ehAdministradorPorId = new Map<UsuarioId, boolean>();
  for (const usuario of instituicao) {
    const ehAdministrador = ehAdministradorAtivo(usuario);
    const jaVisto = ehAdministradorPorId.get(usuario.id);
    if (jaVisto !== undefined && jaVisto !== ehAdministrador) {
      throw new RangeError(`estado da instituição com linhas conflitantes para o usuário ${usuario.id}`);
    }
    ehAdministradorPorId.set(usuario.id, ehAdministrador);
  }
  return new Set([...ehAdministradorPorId].filter(([, ehAdministrador]) => ehAdministrador).map(([id]) => id));
}

export class PoliticaDoUltimoAdministrador {
  verificar(
    antes: readonly UsuarioDaInstituicao[],
    depois: readonly UsuarioDaInstituicao[],
    autorId: UsuarioId,
  ): Result<void, ErroDeDominio> {
    const administradoresAntes = idsDosAdministradoresAtivos(antes);
    const administradoresDepois = idsDosAdministradoresAtivos(depois);

    if (administradoresAntes.size > 0 && administradoresDepois.size === 0) {
      return err(erroDeDominio('ULTIMO_ADMINISTRADOR', { autorId, administradoresAfetados: [...administradoresAntes] }));
    }
    return ok();
  }
}
