import { Injectable } from '@nestjs/common';
import type { UsuarioAtivado, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from './conferidor-de-sujeito.js';
import { GeradorDeTokenDeConvite } from './gerador-de-token-de-convite.js';
import { ResolvedorDeConvite } from './resolvedor-de-convite.js';

export interface ComandoDeAtivacao {
  readonly token: string;
  readonly sujeito: string;
}

type ResultadoDaAtivacao = Result<UsuarioAtivado, ErroDeDominio>;

const USUARIO_ATIVADO: UsuarioAtivado = { situacao: 'ATIVO' };

@Injectable()
export class AtivarConvite {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly convites: ResolvedorDeConvite,
    private readonly gerador: GeradorDeTokenDeConvite,
    private readonly conferidor: ConferidorDeSujeito,
    private readonly relogio: Relogio,
  ) {}

  async executar({ token, sujeito }: ComandoDeAtivacao): Promise<ResultadoDaAtivacao> {
    const hash = this.gerador.hashDe(token);
    const dono = await this.convites.resolver(hash);
    if (dono === undefined) return err(erroDeDominio('CONVITE_INVALIDO'));

    return emContextoDaInstituicao(dono.instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('escrita', () => this.ativarNaInstituicao(dono.usuarioId, hash, sujeito)),
    );
  }

  private async ativarNaInstituicao(
    usuarioId: UsuarioId,
    hash: string,
    sujeito: string,
  ): Promise<ResultadoDaAtivacao> {
    const usuario = await this.usuarios.porId(usuarioId);
    if (usuario === undefined) return err(erroDeDominio('CONVITE_INVALIDO'));

    const agora = this.relogio.agora();
    const avaliacao = usuario.avaliarAtivacao(hash, sujeito, agora);
    if (avaliacao.tipo === 'erro') return avaliacao;
    if (avaliacao.valor === 'JA_ATIVADO_PELO_MESMO_SUJEITO') return ok(USUARIO_ATIVADO);

    const conferencia = await this.conferirEmailDoSujeito(usuario.email, sujeito);
    if (conferencia.tipo === 'erro') return conferencia;

    const ativado = usuario.ativar(hash, sujeito, agora);
    if (ativado.tipo === 'erro') return ativado;
    await this.usuarios.salvar(usuario);
    return ok(USUARIO_ATIVADO);
  }

  private async conferirEmailDoSujeito(emailDoConvite: string, sujeito: string): Promise<Result<void, ErroDeDominio>> {
    try {
      const emailNoProvedor = await this.conferidor.emailDo(sujeito);
      return emailNoProvedor?.toLowerCase() === emailDoConvite.toLowerCase()
        ? ok()
        : err(erroDeDominio('CONVITE_DE_OUTRO_SUJEITO'));
    } catch (erro) {
      if (erro instanceof ProvedorDeIdentidadeIndisponivel) return err(erroDeDominio('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'));
      throw erro;
    }
  }
}
