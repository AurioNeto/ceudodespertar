import { Injectable } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { expiracaoMaximaDoConvite } from '../../domain/usuario/convite.js';
import { Usuario } from '../../domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from '../convite/conferidor-de-sujeito.js';
import type { ConviteParaEnviar } from '../convite/enviador-de-convite.js';
import { GeradorDeTokenDeConvite } from '../convite/gerador-de-token-de-convite.js';
import type { TokenDeConvite } from '../convite/gerador-de-token-de-convite.js';
import { normalizarEmail } from '../convite/normalizar-email.js';
import { LeitorDeGruposDaInstituicao } from '../usuarios/leitor-de-grupos-da-instituicao.js';
import { PersistenciaDoBootstrap } from './persistencia-do-bootstrap.js';
import { SemeadorDeGrupos } from './semeador-de-grupos.js';

export interface ComandoDeBootstrap {
  readonly instituicaoNome: string;
  readonly adminNome: string;
  readonly adminEmail: string;
  readonly sujeito?: string | undefined;
}

export type BootstrapPorConvite = {
  readonly modo: 'CONVITE';
  readonly instituicaoId: string;
  readonly usuarioId: UsuarioId;
  readonly convite: ConviteParaEnviar;
};

export type BootstrapPorVinculo = {
  readonly modo: 'VINCULO';
  readonly instituicaoId: string;
  readonly usuarioId: UsuarioId;
};

export type ResultadoDoBootstrap = BootstrapPorConvite | BootstrapPorVinculo;

interface PlanoDoBootstrap {
  readonly comando: ComandoDeBootstrap;
  readonly instituicaoId: string;
  readonly usuarioId: UsuarioId;
  readonly convite: TokenDeConvite;
}

@Injectable()
export class BootstrapDaIdentidade {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly persistencia: PersistenciaDoBootstrap,
    private readonly semeador: SemeadorDeGrupos,
    private readonly grupos: LeitorDeGruposDaInstituicao,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly gerador: GeradorDeTokenDeConvite,
    private readonly conferidor: ConferidorDeSujeito,
    private readonly relogio: Relogio,
  ) {}

  async executar(comandoRecebido: ComandoDeBootstrap): Promise<Result<ResultadoDoBootstrap, ErroDeDominio>> {
    const comando = { ...comandoRecebido, adminEmail: normalizarEmail(comandoRecebido.adminEmail) };
    if (comando.sujeito !== undefined) {
      const conferencia = await this.conferirEmailDoSujeito(comando.sujeito, comando.adminEmail);
      if (conferencia.tipo === 'erro') return conferencia;
    }

    const plano: PlanoDoBootstrap = {
      comando,
      instituicaoId: gerarUuidV7(),
      usuarioId: gerarUuidV7() as UsuarioId,
      convite: this.gerador.gerar(),
    };
    return emContextoDaInstituicao(plano.instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('escrita', () => this.gravar(plano)),
    );
  }

  private async gravar(plano: PlanoDoBootstrap): Promise<Result<ResultadoDoBootstrap, ErroDeDominio>> {
    const { comando, instituicaoId, usuarioId } = plano;

    await this.persistencia.adquirirTravaGlobal();
    if (await this.persistencia.jaFoiExecutado()) return err(erroDeDominio('BOOTSTRAP_JA_EXECUTADO'));

    await this.persistencia.criarInstituicao(instituicaoId, comando.instituicaoNome);
    await this.semeador.semear(instituicaoId);

    const grupoAdministrador = await this.grupos.doSistema('ADMINISTRADOR');
    if (grupoAdministrador === undefined) {
      return err(erroDeDominio('GRUPO_INEXISTENTE', { codigoSistema: 'ADMINISTRADOR' }));
    }

    const convidadoEm = this.relogio.agora();
    const expiraEm = expiracaoMaximaDoConvite(convidadoEm);
    const usuario = Usuario.convidar({
      id: usuarioId,
      nome: comando.adminNome,
      email: comando.adminEmail,
      grupos: [grupoAdministrador.id],
      hashDoConvite: plano.convite.hash,
      conviteExpiraEm: expiraEm,
      convidadoPor: usuarioId,
      em: convidadoEm,
    });
    await this.usuarios.adicionar(usuario);

    if (comando.sujeito !== undefined) {
      const ativado = usuario.ativar(plano.convite.hash, comando.sujeito, this.relogio.agora());
      if (ativado.tipo === 'erro') return ativado;
      await this.usuarios.salvar(usuario);
    }

    await this.persistencia.registrarExecucao(usuarioId, convidadoEm);

    if (comando.sujeito !== undefined) return ok({ modo: 'VINCULO', instituicaoId, usuarioId });
    return ok({
      modo: 'CONVITE',
      instituicaoId,
      usuarioId,
      convite: { usuarioId, email: comando.adminEmail, nome: comando.adminNome, token: plano.convite.token, expiraEm },
    });
  }

  private async conferirEmailDoSujeito(sujeito: string, emailInformado: string): Promise<Result<void, ErroDeDominio>> {
    try {
      const emailNoProvedor = await this.conferidor.emailDo(sujeito);
      if (emailNoProvedor === undefined) return err(erroDeDominio('SUJEITO_INEXISTENTE'));
      return normalizarEmail(emailNoProvedor) === normalizarEmail(emailInformado)
        ? ok()
        : err(erroDeDominio('EMAIL_DO_SUJEITO_DIVERGENTE'));
    } catch (erro) {
      if (erro instanceof ProvedorDeIdentidadeIndisponivel) {
        return err(erroDeDominio('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'));
      }
      throw erro;
    }
  }
}
