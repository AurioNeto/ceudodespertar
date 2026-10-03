import type { InstituicaoId, Permissao, UsuarioId } from '@cdd/contracts';
import { criarContextoDeAcesso, recusarAcesso, ResolvedorDeContextoDeAcesso } from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type {
  CodigoDeRecusa,
  ContextoDeAcesso,
  RecusaDeAcesso,
} from '../../src/shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { IdentidadeAutenticada } from '../../src/shared/infrastructure/autenticacao/identidade-autenticada.js';

export const USUARIO_DE_TESTE = 'usuario-1' as UsuarioId;
export const INSTITUICAO_DE_TESTE = 'instituicao-1' as InstituicaoId;

export class ResolvedorDeContextoDeAcessoFake extends ResolvedorDeContextoDeAcesso {
  readonly identidadesResolvidas: IdentidadeAutenticada[] = [];
  private resposta: ContextoDeAcesso | RecusaDeAcesso = recusarAcesso('USUARIO_DESCONHECIDO');

  concederPermissoes(...permissoes: Permissao[]): void {
    this.resposta = criarContextoDeAcesso({
      usuarioId: USUARIO_DE_TESTE,
      instituicaoId: INSTITUICAO_DE_TESTE,
      permissoes: new Set(permissoes),
    });
  }

  recusarCom(codigo: CodigoDeRecusa): void {
    this.resposta = recusarAcesso(codigo);
  }

  resolver(identidade: IdentidadeAutenticada): Promise<ContextoDeAcesso | RecusaDeAcesso> {
    this.identidadesResolvidas.push(identidade);
    return Promise.resolve(this.resposta);
  }
}
