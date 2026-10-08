import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import type { PermissoesEfetivas } from '../permissao/permissoes-efetivas.js';
import type { Usuario } from '../usuario/usuario.js';

const PERMISSOES_QUE_NUNCA_PODEM_FICAR_SEM_ADMINISTRADOR: readonly Permissao[] = [
  'sistema.usuario.gerenciar',
  'sistema.grupo.gerenciar',
];

export interface UsuarioDaInstituicao {
  readonly id: UsuarioId;
  readonly situacao: SituacaoUsuario;
  readonly permissoesEfetivas: ReadonlySet<Permissao>;
}

export const UsuarioDaInstituicao = {
  de(usuario: Pick<Usuario, 'id' | 'situacao'>, permissoesEfetivas: PermissoesEfetivas): UsuarioDaInstituicao {
    return { id: usuario.id, situacao: usuario.situacao, permissoesEfetivas: new Set(permissoesEfetivas.lista) };
  },
};

function ehAdministradorAtivo(usuario: UsuarioDaInstituicao, permissao: Permissao): boolean {
  return usuario.situacao === 'ATIVO' && usuario.permissoesEfetivas.has(permissao);
}

function idsDosAdministradoresAtivos(instituicao: readonly UsuarioDaInstituicao[], permissao: Permissao): Set<UsuarioId> {
  const ehAdministradorPorId = new Map<UsuarioId, boolean>();
  for (const usuario of instituicao) {
    const ehAdministrador = ehAdministradorAtivo(usuario, permissao);
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
    for (const permissao of PERMISSOES_QUE_NUNCA_PODEM_FICAR_SEM_ADMINISTRADOR) {
      const administradoresAntes = idsDosAdministradoresAtivos(antes, permissao);
      const administradoresDepois = idsDosAdministradoresAtivos(depois, permissao);

      if (administradoresAntes.size > 0 && administradoresDepois.size === 0) {
        return err(
          erroDeDominio('ULTIMO_ADMINISTRADOR', { autorId, permissao, administradoresAfetados: [...administradoresAntes] }),
        );
      }
    }
    return ok();
  }
}
