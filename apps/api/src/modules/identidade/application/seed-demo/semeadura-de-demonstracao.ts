import { Injectable } from '@nestjs/common';
import type { CodigoGrupo, GrupoId, UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { GRUPOS_DE_SISTEMA } from '../../domain/grupo/grupos-de-sistema.js';
import { expiracaoMaximaDoConvite } from '../../domain/usuario/convite.js';
import { Usuario } from '../../domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../domain/usuario/usuario.repo.js';
import { PersistenciaDoBootstrap } from '../bootstrap/persistencia-do-bootstrap.js';
import { SemeadorDeGrupos } from '../bootstrap/semeador-de-grupos.js';
import { ProvedorDeIdentidadeIndisponivel } from '../convite/conferidor-de-sujeito.js';
import { GeradorDeTokenDeConvite } from '../convite/gerador-de-token-de-convite.js';
import { LeitorDeGruposDaInstituicao } from '../usuarios/leitor-de-grupos-da-instituicao.js';
import {
  emailDoFicticio,
  ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
  MOTIVO_DA_SUSPENSAO_DE_DEMONSTRACAO,
  NOME_DA_INSTITUICAO_DE_DEMONSTRACAO,
  subDoFicticio,
  USERNAME_DO_DEV,
  USUARIOS_FICTICIOS,
} from './conteudo-da-demonstracao.js';
import type { SituacaoDeSemeadura } from './conteudo-da-demonstracao.js';
import { LocalizadorDeSujeito } from './localizador-de-sujeito.js';
import { PersistenciaDaDemonstracao } from './persistencia-da-demonstracao.js';

export interface ResumoDaSemeadura {
  readonly instituicaoId: string;
  readonly instituicaoCriada: boolean;
  readonly usuariosCriados: number;
  readonly usuariosJaExistentes: number;
}

interface UsuarioParaSemear {
  readonly id: UsuarioId;
  readonly nome: string;
  readonly email: string;
  readonly grupo: CodigoGrupo;
  readonly situacao: SituacaoDeSemeadura;
  readonly subjectId: string | null;
}

const DEV_COMO_ADMINISTRADOR_ATIVO: Omit<UsuarioParaSemear, 'id' | 'subjectId'> = {
  nome: 'Desenvolvedor Local',
  email: USERNAME_DO_DEV,
  grupo: 'ADMINISTRADOR',
  situacao: 'ATIVO',
};

@Injectable()
export class SemeaduraDeDemonstracao {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly bootstrap: PersistenciaDoBootstrap,
    private readonly demonstracao: PersistenciaDaDemonstracao,
    private readonly semeador: SemeadorDeGrupos,
    private readonly grupos: LeitorDeGruposDaInstituicao,
    private readonly usuarios: RepositorioDeUsuario,
    private readonly gerador: GeradorDeTokenDeConvite,
    private readonly localizador: LocalizadorDeSujeito,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<Result<ResumoDaSemeadura, ErroDeDominio>> {
    const subDoDev = await this.localizarSubDoDev();
    if (subDoDev.tipo === 'erro') return subDoDev;
    return emContextoDaInstituicao(ID_DA_INSTITUICAO_DE_DEMONSTRACAO, () =>
      this.unidadeDeTrabalho.transacao('escrita', () => this.gravar(subDoDev.valor)),
    );
  }

  private async localizarSubDoDev(): Promise<Result<string, ErroDeDominio>> {
    try {
      const sub = await this.localizador.subDoUsuario(USERNAME_DO_DEV);
      return sub === undefined ? err(erroDeDominio('DEV_NAO_ENCONTRADO_NO_PROVEDOR')) : ok(sub);
    } catch (erro) {
      if (erro instanceof ProvedorDeIdentidadeIndisponivel) {
        return err(erroDeDominio('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'));
      }
      throw erro;
    }
  }

  private async gravar(subDoDev: string): Promise<Result<ResumoDaSemeadura, ErroDeDominio>> {
    await this.bootstrap.adquirirTravaGlobal();
    if (await this.demonstracao.existeInstituicaoAlemDe(ID_DA_INSTITUICAO_DE_DEMONSTRACAO)) {
      return err(erroDeDominio('INSTITUICAO_NAO_DEMO_EXISTENTE'));
    }
    const devExistente = await this.demonstracao.usuarioPorEmail(USERNAME_DO_DEV);
    if (devExistente?.subjectId === null) {
      return err(erroDeDominio('DEV_COM_CONVITE_PENDENTE'));
    }
    if (devExistente !== undefined && devExistente.subjectId !== subDoDev) {
      return err(erroDeDominio('SUJEITO_DO_DEV_DIVERGENTE'));
    }

    const instituicaoCriada = !(await this.demonstracao.instituicaoExiste(ID_DA_INSTITUICAO_DE_DEMONSTRACAO));
    if (instituicaoCriada) {
      await this.bootstrap.criarInstituicao(ID_DA_INSTITUICAO_DE_DEMONSTRACAO, NOME_DA_INSTITUICAO_DE_DEMONSTRACAO);
    }
    await this.semeador.semear(ID_DA_INSTITUICAO_DE_DEMONSTRACAO);
    const idsDosGrupos = await this.idsDosGruposDeSistema();
    if (idsDosGrupos.tipo === 'erro') return idsDosGrupos;

    const devId = devExistente?.id ?? (gerarUuidV7() as UsuarioId);
    let usuariosCriados = 0;
    let usuariosJaExistentes = 0;
    for (const especificacao of especificacoesDaDemonstracao(devId, subDoDev)) {
      // eslint-disable-next-line no-await-in-loop -- o dev é criado antes de ser autor dos demais
      const jaExiste = (await this.demonstracao.usuarioPorEmail(especificacao.email)) !== undefined;
      if (jaExiste) {
        usuariosJaExistentes += 1;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- idem
      const criado = await this.criar(especificacao, idsDosGrupos.valor, devId);
      if (criado.tipo === 'erro') return criado;
      usuariosCriados += 1;
    }
    return ok({ instituicaoId: ID_DA_INSTITUICAO_DE_DEMONSTRACAO, instituicaoCriada, usuariosCriados, usuariosJaExistentes });
  }

  private async idsDosGruposDeSistema(): Promise<Result<ReadonlyMap<CodigoGrupo, GrupoId>, ErroDeDominio>> {
    const ids = new Map<CodigoGrupo, GrupoId>();
    for (const { codigoSistema } of GRUPOS_DE_SISTEMA) {
      // eslint-disable-next-line no-await-in-loop -- seis leituras curtas na mesma transação
      const grupo = await this.grupos.doSistema(codigoSistema);
      if (grupo === undefined) return err(erroDeDominio('GRUPO_INEXISTENTE', { codigoSistema }));
      ids.set(codigoSistema, grupo.id);
    }
    return ok(ids);
  }

  private async criar(
    especificacao: UsuarioParaSemear,
    idsDosGrupos: ReadonlyMap<CodigoGrupo, GrupoId>,
    autorId: UsuarioId,
  ): Promise<Result<void, ErroDeDominio>> {
    const convite = this.gerador.gerar();
    const convidadoEm = this.relogio.agora();
    const usuario = Usuario.convidar({
      id: especificacao.id,
      nome: especificacao.nome,
      email: especificacao.email,
      grupos: [idsDosGrupos.get(especificacao.grupo) as GrupoId],
      hashDoConvite: convite.hash,
      conviteExpiraEm: expiracaoMaximaDoConvite(convidadoEm),
      convidadoPor: autorId,
      em: convidadoEm,
    });
    const situacaoAlcancada = this.levarAteASituacao(usuario, especificacao, convite.hash, autorId);
    if (situacaoAlcancada.tipo === 'erro') return situacaoAlcancada;
    await this.usuarios.adicionar(usuario);
    return ok();
  }

  private levarAteASituacao(
    usuario: Usuario,
    { situacao, subjectId }: UsuarioParaSemear,
    hashDoConvite: string,
    autorId: UsuarioId,
  ): Result<void, ErroDeDominio> {
    if (situacao === 'CONVITE_PENDENTE') return ok();
    const ativado = usuario.ativar(hashDoConvite, subjectId as string, this.relogio.agora());
    if (ativado.tipo === 'erro' || situacao === 'ATIVO') return ativado;
    return usuario.desativar(autorId, MOTIVO_DA_SUSPENSAO_DE_DEMONSTRACAO, this.relogio.agora());
  }
}

function especificacoesDaDemonstracao(devId: UsuarioId, subDoDev: string): readonly UsuarioParaSemear[] {
  return [
    { ...DEV_COMO_ADMINISTRADOR_ATIVO, id: devId, subjectId: subDoDev },
    ...USUARIOS_FICTICIOS.map(({ slug, nome, grupo, situacao }) => ({
      id: gerarUuidV7() as UsuarioId,
      nome,
      email: emailDoFicticio(slug),
      grupo,
      situacao,
      subjectId: situacao === 'CONVITE_PENDENTE' ? null : subDoFicticio(slug),
    })),
  ];
}
