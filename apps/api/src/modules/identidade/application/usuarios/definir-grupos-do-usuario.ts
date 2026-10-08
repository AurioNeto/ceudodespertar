import { Injectable } from '@nestjs/common';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { AlteracaoQuePodeTirarAdministrador, efeitoDoUsuario } from '../administracao/alteracao-que-pode-tirar-administrador.js';
import type { FotografiaDaAdministracao } from '../administracao/leitor-da-administracao.js';
import { conferirVersao, salvarSeAlterado } from '../conferir-versao.js';
import type { AcessoDoUsuario } from '../obter-eu.js';

export interface ComandoDeDefinicaoDeGrupos {
  readonly usuarioId: UsuarioId;
  readonly versaoEsperada: number;
  readonly grupos: readonly GrupoId[];
}

export interface GruposDefinidos {
  readonly grupos: readonly GrupoId[];
  readonly versao: number;
}

function gruposForaDaInstituicao(grupos: readonly GrupoId[], fotografia: FotografiaDaAdministracao): GrupoId[] {
  const ativos = new Set(fotografia.gruposAtivos.map((grupo) => grupo.id));
  return grupos.filter((grupoId) => !ativos.has(grupoId));
}

@Injectable()
export class DefinirGruposDoUsuario {
  constructor(
    private readonly alteracao: AlteracaoQuePodeTirarAdministrador,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly relogio: Relogio,
  ) {}

  executar(acesso: AcessoDoUsuario, comando: ComandoDeDefinicaoDeGrupos): Promise<Result<GruposDefinidos, ErroDeDominio>> {
    return this.alteracao.executar({
      acesso,
      mutar: async (antes) => {
        const encontrado = conferirVersao(await this.usuarios.porId(comando.usuarioId), comando.versaoEsperada);
        if (encontrado.tipo === 'erro') return encontrado;
        const usuario = encontrado.valor;

        const inexistentes = gruposForaDaInstituicao(comando.grupos, antes);
        if (inexistentes.length > 0) return err(erroDeDominio('GRUPO_INEXISTENTE', { grupos: inexistentes }));

        const definido = usuario.definirGrupos(comando.grupos, acesso.usuarioId, this.relogio.agora());
        if (definido.tipo === 'erro') return definido;

        return ok({
          efeito: efeitoDoUsuario(usuario),
          salvar: async () => ({ grupos: usuario.grupos, versao: await salvarSeAlterado(this.usuarios, usuario) }),
        });
      },
    });
  }
}
