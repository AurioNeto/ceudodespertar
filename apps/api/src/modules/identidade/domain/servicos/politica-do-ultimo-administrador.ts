import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

const PERMISSAO_DE_ADMINISTRADOR: Permissao = 'sistema.usuario.gerenciar';

export interface UsuarioDaInstituicao {
  readonly id: UsuarioId;
  readonly situacao: SituacaoUsuario;
  readonly permissoesEfetivas: ReadonlySet<Permissao>;
}

export type MudancaProposta =
  | {
      readonly tipo: 'TROCAR_GRUPOS';
      readonly autorId: UsuarioId;
      readonly usuarioId: UsuarioId;
      readonly permissoesResultantes: ReadonlySet<Permissao>;
    }
  | { readonly tipo: 'SUSPENDER'; readonly autorId: UsuarioId; readonly usuarioId: UsuarioId };

function ehAdministradorAtivo(usuario: UsuarioDaInstituicao): boolean {
  return usuario.situacao === 'ATIVO' && usuario.permissoesEfetivas.has(PERMISSAO_DE_ADMINISTRADOR);
}

function aplicar(usuario: UsuarioDaInstituicao, mudanca: MudancaProposta): UsuarioDaInstituicao {
  return mudanca.tipo === 'SUSPENDER'
    ? { ...usuario, situacao: 'SUSPENSO' }
    : { ...usuario, permissoesEfetivas: mudanca.permissoesResultantes };
}

export class PoliticaDoUltimoAdministrador {
  verificar(instituicao: readonly UsuarioDaInstituicao[], mudanca: MudancaProposta): Result<void, ErroDeDominio> {
    const alvo = instituicao.find((usuario) => usuario.id === mudanca.usuarioId);
    if (alvo === undefined) return err(erroDeDominio('USUARIO_DESCONHECIDO'));

    const alvoPerdeAdministracao = ehAdministradorAtivo(alvo) && !ehAdministradorAtivo(aplicar(alvo, mudanca));
    const haOutroAdministrador = instituicao.some((usuario) => usuario !== alvo && ehAdministradorAtivo(usuario));

    if (alvoPerdeAdministracao && !haOutroAdministrador) {
      return err(erroDeDominio('ULTIMO_ADMINISTRADOR', { autorId: mudanca.autorId, usuarioId: mudanca.usuarioId }));
    }
    return ok();
  }
}
