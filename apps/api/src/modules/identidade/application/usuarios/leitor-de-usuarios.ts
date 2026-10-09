import type { GrupoId, SituacaoUsuario, UsuarioId, UsuarioListado } from '@cdd/contracts';
import type { PosicaoDaListagem } from './cursor-de-usuarios.js';

export interface ConsultaDeUsuarios {
  readonly usuarioId?: UsuarioId;
  readonly situacao?: SituacaoUsuario;
  readonly grupoId?: GrupoId;
  readonly busca?: string;
  readonly depois: PosicaoDaListagem | null;
  readonly limite: number;
}

export interface UsuarioComPosicao {
  readonly usuario: UsuarioListado;
  readonly posicao: PosicaoDaListagem;
}

export abstract class LeitorDeUsuarios {
  abstract ler(consulta: ConsultaDeUsuarios): Promise<UsuarioComPosicao[]>;
}
