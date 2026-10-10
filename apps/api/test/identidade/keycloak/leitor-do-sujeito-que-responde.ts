import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { LeitorDoSujeitoDoUsuario } from '../../../src/modules/identidade/application/usuarios/leitor-do-sujeito-do-usuario.js';
import type { SujeitoDoUsuario } from '../../../src/modules/identidade/application/usuarios/leitor-do-sujeito-do-usuario.js';

export class LeitorDoSujeitoQueResponde extends LeitorDoSujeitoDoUsuario {
  readonly leituras: Array<{ usuarioId: UsuarioId; instituicaoId: InstituicaoId }> = [];

  constructor(public sujeito: SujeitoDoUsuario | undefined = { subjectId: 'sub', situacao: 'ATIVO' }) {
    super();
  }

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<SujeitoDoUsuario | undefined> {
    this.leituras.push({ usuarioId, instituicaoId });
    return Promise.resolve(this.sujeito);
  }
}
