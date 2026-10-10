import { Injectable } from '@nestjs/common';
import type { UsuarioAtivado, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import type { DesfechoDaAvaliacaoDeAtivacao, Usuario } from '../../domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from './conferidor-de-sujeito.js';
import { GeradorDeTokenDeConvite } from './gerador-de-token-de-convite.js';
import { normalizarEmail } from './normalizar-email.js';
import { ResolvedorDeConvite } from './resolvedor-de-convite.js';

export interface ComandoDeAtivacao {
  readonly token: string;
  readonly sujeito: string;
}

type ResultadoDaAtivacao = Result<UsuarioAtivado, ErroDeDominio>;

interface AvaliacaoCarregada {
  readonly usuario: Usuario;
  readonly desfecho: DesfechoDaAvaliacaoDeAtivacao;
}

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

    return emContextoDaInstituicao(dono.instituicaoId, () => this.ativarNaInstituicao(dono.usuarioId, hash, sujeito));
  }

  private async ativarNaInstituicao(usuarioId: UsuarioId, hash: string, sujeito: string): Promise<ResultadoDaAtivacao> {
    const previa = await this.unidadeDeTrabalho.transacao('leitura', () =>
      this.avaliarAtivacao(usuarioId, hash, sujeito),
    );
    if (previa.tipo === 'erro') return previa;
    if (previa.valor.desfecho === 'JA_ATIVADO_PELO_MESMO_SUJEITO') return ok(USUARIO_ATIVADO);

    const conferencia = await this.conferirEmailDoSujeito(previa.valor.usuario.email, sujeito);
    if (conferencia.tipo === 'erro') return conferencia;

    return this.unidadeDeTrabalho.transacao('escrita', () => this.ativarSeAindaValido(usuarioId, hash, sujeito));
  }

  private async avaliarAtivacao(usuarioId: UsuarioId, hash: string, sujeito: string): Promise<Result<AvaliacaoCarregada, ErroDeDominio>> {
    const usuario = await this.usuarios.porId(usuarioId);
    if (usuario === undefined) return err(erroDeDominio('CONVITE_INVALIDO'));
    const avaliacao = usuario.avaliarAtivacao(hash, sujeito, this.relogio.agora());
    if (avaliacao.tipo === 'erro') return avaliacao;
    return ok({ usuario, desfecho: avaliacao.valor });
  }

  private async ativarSeAindaValido(usuarioId: UsuarioId, hash: string, sujeito: string): Promise<ResultadoDaAtivacao> {
    const atual = await this.avaliarAtivacao(usuarioId, hash, sujeito);
    if (atual.tipo === 'erro') return atual;
    if (atual.valor.desfecho === 'JA_ATIVADO_PELO_MESMO_SUJEITO') return ok(USUARIO_ATIVADO);

    const { usuario } = atual.valor;
    const ativado = usuario.ativar(hash, sujeito, this.relogio.agora());
    if (ativado.tipo === 'erro') return ativado;
    await this.usuarios.salvar(usuario);
    return ok(USUARIO_ATIVADO);
  }

  private async conferirEmailDoSujeito(emailDoConvite: string, sujeito: string): Promise<Result<void, ErroDeDominio>> {
    try {
      const emailNoProvedor = await this.conferidor.emailDo(sujeito);
      return emailNoProvedor !== undefined && normalizarEmail(emailNoProvedor) === normalizarEmail(emailDoConvite)
        ? ok()
        : err(erroDeDominio('CONVITE_DE_OUTRO_SUJEITO'));
    } catch (erro) {
      if (erro instanceof ProvedorDeIdentidadeIndisponivel) return err(erroDeDominio('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'));
      throw erro;
    }
  }
}
