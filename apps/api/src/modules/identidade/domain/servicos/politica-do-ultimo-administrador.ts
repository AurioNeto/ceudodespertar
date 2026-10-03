import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

const PERMISSAO_DE_ADMINISTRADOR: Permissao = 'sistema.usuario.gerenciar';

export interface UsuarioDaInstituicao {
  readonly id: UsuarioId;
  readonly situacao: SituacaoUsuario;
  readonly permissoesEfetivas: ReadonlySet<Permissao>;
}

function ehAdministradorAtivo(usuario: UsuarioDaInstituicao): boolean {
  return usuario.situacao === 'ATIVO' && usuario.permissoesEfetivas.has(PERMISSAO_DE_ADMINISTRADOR);
}

function idsDosAdministradoresAtivos(instituicao: readonly UsuarioDaInstituicao[]): Set<UsuarioId> {
  return new Set(instituicao.filter(ehAdministradorAtivo).map((usuario) => usuario.id));
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
