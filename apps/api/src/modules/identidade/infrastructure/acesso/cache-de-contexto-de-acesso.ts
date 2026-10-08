import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import type { ContextoDeAcesso, RecusaDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { Relogio } from '../../../../shared/infrastructure/relogio.js';

export const TTL_DO_CACHE_DE_ACESSO_EM_MS = 60_000;

export type ResultadoDoAcesso = ContextoDeAcesso | RecusaDeAcesso;

export interface DonoDoAcesso {
  readonly usuarioId: UsuarioId;
  readonly instituicaoId: InstituicaoId;
}

interface EntradaDoCache {
  readonly dono: DonoDoAcesso;
  readonly resultado: ResultadoDoAcesso;
  readonly expiraEm: number;
}

function copiarResultado(resultado: ResultadoDoAcesso): ResultadoDoAcesso {
  return resultado.recusada ? resultado : { ...resultado, permissoes: new Set(resultado.permissoes) };
}

export class CacheDeContextoDeAcesso {
  private readonly entradas = new Map<string, EntradaDoCache>();
  private geracao = 0;

  constructor(
    private readonly relogio: Relogio,
    private readonly ttlEmMs: number = TTL_DO_CACHE_DE_ACESSO_EM_MS,
  ) {}

  obter(sujeito: string): ResultadoDoAcesso | undefined {
    const entrada = this.entradas.get(sujeito);
    if (entrada === undefined) return undefined;
    if (entrada.expiraEm <= this.relogio.agora().getTime()) {
      this.entradas.delete(sujeito);
      return undefined;
    }
    return copiarResultado(entrada.resultado);
  }

  geracaoAtual(): number {
    return this.geracao;
  }

  guardar(sujeito: string, dono: DonoDoAcesso, resultado: ResultadoDoAcesso, geracaoDaLeitura: number): void {
    if (geracaoDaLeitura !== this.geracao) return;
    this.entradas.set(sujeito, { dono, resultado: copiarResultado(resultado), expiraEm: this.relogio.agora().getTime() + this.ttlEmMs });
  }

  invalidarUsuario(usuarioId: string): void {
    this.invalidarOndeDono((dono) => dono.usuarioId === usuarioId);
  }

  invalidarInstituicao(instituicaoId: string): void {
    this.invalidarOndeDono((dono) => dono.instituicaoId === instituicaoId);
  }

  invalidarTudo(): void {
    this.invalidarOndeDono(() => true);
  }

  private invalidarOndeDono(alvo: (dono: DonoDoAcesso) => boolean): void {
    this.geracao += 1;
    for (const [sujeito, entrada] of this.entradas) {
      if (alvo(entrada.dono)) this.entradas.delete(sujeito);
    }
  }
}
