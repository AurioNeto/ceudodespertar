import type { GrupoId, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { TravaDaAdministracao } from '../../src/modules/identidade/application/administracao/trava-da-administracao.js';
import { CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO } from '../../src/modules/identidade/infrastructure/administracao/trava-da-administracao.advisory.js';
import type { Grupo } from '../../src/modules/identidade/domain/grupo/grupo.js';
import { ehErr, ehOk } from '../../src/shared/kernel/result.js';
import { criarBarreira } from './barreira.js';
import type { Barreira } from './barreira.js';
import {
  abrirAmbienteDaIdentidade,
  AUTOR,
  consultarNaInstituicao,
  hashDeConvite,
  montarCasosDeUsoDaGestao,
  novoGrupo,
  novoUsuarioConvidado,
} from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const ATIVACAO = new Date('2026-03-02T10:00:00.000Z');
const DUAS_TRANSACOES = 2;
const LIMITE_DE_TENTATIVAS_DE_BLOQUEIO = 100;
const INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS = 25;
const CHAVE_DO_TRAVAMENTO_DO_SEED = 'identidade.semear-grupos-de-sistema';
const PERMISSOES_DE_ADMINISTRADOR = ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'];

class TravaComBarreira extends TravaDaAdministracao {
  constructor(
    private readonly real: TravaDaAdministracao,
    private readonly barreira: Barreira,
  ) {
    super();
  }

  async adquirir(instituicaoId: InstituicaoId): Promise<void> {
    await this.barreira.aguardar();
    await this.real.adquirir(instituicaoId);
  }
}

function chaveDeTravamento(prefixo: string, instituicaoId: string): string {
  return prefixo + instituicaoId;
}

describe('administração da instituição', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco, 6);
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function naInstituicaoA<T>(fn: () => Promise<T>): Promise<T> {
    return comContexto(INSTITUICAO_A, fn);
  }

  async function criarGrupoAdministrador(): Promise<Grupo> {
    const grupo = novoGrupo(PERMISSOES_DE_ADMINISTRADOR);
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    return grupo;
  }

  async function criarUsuarioAtivo(grupos: readonly GrupoId[]): Promise<UsuarioId> {
    const convidado = novoUsuarioConvidado(grupos);
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const usuario = (await naInstituicaoA(() => ambiente.usuarios.porId(convidado.id)))!;
    usuario.ativar(convidado.convite!.hashDoToken, `sub-${hashDeConvite().slice(0, 8)}`, ATIVACAO);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));
    return convidado.id;
  }

  async function versaoDe(usuarioId: UsuarioId): Promise<number> {
    const usuario = (await naInstituicaoA(() => ambiente.usuarios.porId(usuarioId)))!;
    return usuario.versao;
  }

  async function esperarBackendsBloqueados(quantidade: number, tentativasRestantes = LIMITE_DE_TENTATIVAS_DE_BLOQUEIO): Promise<void> {
    await banco.owner.query('select pg_stat_clear_snapshot()');
    const { rows } = await banco.owner.query<{ total: number }>(
      `select count(*)::int as total from pg_stat_activity
        where datname = current_database() and pg_blocking_pids(pid) != '{}'`,
    );
    if ((rows[0]?.total ?? 0) >= quantidade) return;
    if (tentativasRestantes <= 0) throw new Error(`${quantidade} backend(s) nunca ficaram bloqueados esperando a trava`);
    await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS));
    await esperarBackendsBloqueados(quantidade, tentativasRestantes - 1);
  }

  async function segurarTrava(prefixo: string, instituicaoId: string): Promise<() => Promise<void>> {
    await banco.owner.query('begin');
    await banco.owner.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      chaveDeTravamento(prefixo, instituicaoId),
    ]);
    return async () => {
      await banco.owner.query('rollback');
    };
  }

  describe('LeitorDaAdministracaoKysely', () => {
    it('devolve usuários com situação e grupos, e só os grupos ativos com suas permissões', async () => {
      const grupoAtivo = novoGrupo(['financeiro.lancamento.ler', 'financeiro.conta.ler']);
      const grupoExcluido = novoGrupo(['financeiro.dre.ler']);
      await naInstituicaoA(() => ambiente.grupos.adicionar(grupoAtivo));
      await naInstituicaoA(() => ambiente.grupos.adicionar(grupoExcluido));
      const comGrupos = await criarUsuarioAtivo([grupoAtivo.id, grupoExcluido.id]);
      const semGrupos = await criarUsuarioAtivo([]);
      const excluindo = (await naInstituicaoA(() => ambiente.grupos.porId(grupoExcluido.id)))!;
      excluindo.excluir(0, AUTOR, ATIVACAO);
      await naInstituicaoA(() => ambiente.grupos.salvar(excluindo));

      const fotografia = await naInstituicaoA(() => ambiente.leitor.instituicao());

      expect(fotografia.usuarios.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
        [
          { id: comGrupos, situacao: 'ATIVO', grupos: [grupoAtivo.id, grupoExcluido.id].toSorted() },
          { id: semGrupos, situacao: 'ATIVO', grupos: [] },
        ].toSorted((a, b) => a.id.localeCompare(b.id)),
      );
      expect(fotografia.gruposAtivos).toEqual([
        { id: grupoAtivo.id, permissoes: ['financeiro.conta.ler', 'financeiro.lancamento.ler'] },
      ]);
    });

    it('não enxerga usuários nem grupos de outra instituição', async () => {
      await criarGrupoAdministrador();
      await criarUsuarioAtivo([]);

      const fotografiaDeB = await comContexto(INSTITUICAO_B, () => ambiente.leitor.instituicao());

      expect(fotografiaDeB).toEqual({ usuarios: [], gruposAtivos: [] });
    });

    it('não traz nome, e-mail nem convite', async () => {
      await criarUsuarioAtivo([]);

      const fotografia = await naInstituicaoA(() => ambiente.leitor.instituicao());

      expect(Object.keys(fotografia.usuarios[0]!).toSorted()).toEqual(['grupos', 'id', 'situacao']);
    });
  });

  describe('TravaDaAdministracaoAdvisory', () => {
    it('espera quem já segura a trava da mesma instituição e prossegue quando ela é liberada', async () => {
      const liberar = await segurarTrava(CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO, INSTITUICAO_A);
      let concluiu = false;

      const adquirindo = naInstituicaoA(() =>
        ambiente.unidadeDeTrabalho.transacao('escrita', () => ambiente.trava.adquirir(INSTITUICAO_A as InstituicaoId)),
      ).then(() => {
        concluiu = true;
      });
      await esperarBackendsBloqueados(1);
      expect(concluiu).toBe(false);

      await liberar();
      await adquirindo;
      expect(concluiu).toBe(true);
    });

    it('não espera a trava de outra instituição', async () => {
      const liberar = await segurarTrava(CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO, INSTITUICAO_B);

      await comContexto(INSTITUICAO_A, () =>
        ambiente.unidadeDeTrabalho.transacao('escrita', () => ambiente.trava.adquirir(INSTITUICAO_A as InstituicaoId)),
      );

      await liberar();
    });

    it('não colide com a trava do semeador de grupos de sistema', async () => {
      const liberar = await segurarTrava(CHAVE_DO_TRAVAMENTO_DO_SEED, INSTITUICAO_A);

      await naInstituicaoA(() =>
        ambiente.unidadeDeTrabalho.transacao('escrita', () => ambiente.trava.adquirir(INSTITUICAO_A as InstituicaoId)),
      );

      await liberar();
    });
  });

  describe('serviço das alterações que podem tirar administrador', () => {
    it('só lê o estado e muda o usuário depois de obter a trava', async () => {
      const grupoAdministrador = await criarGrupoAdministrador();
      const alvo = await criarUsuarioAtivo([grupoAdministrador.id]);
      await criarUsuarioAtivo([grupoAdministrador.id]);
      const versaoDoAlvo = await versaoDe(alvo);
      const { desativar } = montarCasosDeUsoDaGestao(ambiente);
      const liberar = await segurarTrava(CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO, INSTITUICAO_A);

      const desativando = naInstituicaoA(() =>
        desativar.executar(
          { usuarioId: AUTOR, instituicaoId: INSTITUICAO_A as InstituicaoId },
          { usuarioId: alvo, versaoEsperada: versaoDoAlvo, motivo: 'saiu da casa' },
        ),
      );
      await esperarBackendsBloqueados(1);
      expect(await versaoDe(alvo)).toBe(versaoDoAlvo);

      await liberar();
      const resultado = await desativando;
      expect(ehOk(resultado) && resultado.valor).toEqual({ situacao: 'SUSPENSO', versao: versaoDoAlvo + 1 });
    });

    it('dois administradores se desativando ao mesmo tempo: um é recusado e resta um ativo', async () => {
      const grupoAdministrador = await criarGrupoAdministrador();
      const x = await criarUsuarioAtivo([grupoAdministrador.id]);
      const y = await criarUsuarioAtivo([grupoAdministrador.id]);
      const [versaoX, versaoY] = [await versaoDe(x), await versaoDe(y)];
      const barreira = criarBarreira(DUAS_TRANSACOES);
      const { desativar } = montarCasosDeUsoDaGestao(ambiente, new TravaComBarreira(ambiente.trava, barreira));
      const acessoDe = (usuarioId: UsuarioId) => ({ usuarioId, instituicaoId: INSTITUICAO_A as InstituicaoId });

      const resultados = await Promise.all([
        naInstituicaoA(() => desativar.executar(acessoDe(y), { usuarioId: x, versaoEsperada: versaoX, motivo: 'saída' })),
        naInstituicaoA(() => desativar.executar(acessoDe(x), { usuarioId: y, versaoEsperada: versaoY, motivo: 'saída' })),
      ]);

      expect(resultados.filter(ehOk)).toHaveLength(1);
      const recusado = resultados.find(ehErr);
      expect(recusado?.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
      const fotografia = await naInstituicaoA(() => ambiente.leitor.instituicao());
      expect(fotografia.usuarios.filter((usuario) => usuario.situacao === 'ATIVO')).toHaveLength(1);
    });

    it('desativar um administrador contra tirar o grupo do outro, cada um em seu grupo: um é recusado', async () => {
      const grupoDeX = await criarGrupoAdministrador();
      const grupoDeY = await criarGrupoAdministrador();
      const x = await criarUsuarioAtivo([grupoDeX.id]);
      const y = await criarUsuarioAtivo([grupoDeY.id]);
      const [versaoX, versaoY] = [await versaoDe(x), await versaoDe(y)];
      const barreira = criarBarreira(DUAS_TRANSACOES);
      const { desativar, definirGrupos } = montarCasosDeUsoDaGestao(
        ambiente,
        new TravaComBarreira(ambiente.trava, barreira),
      );
      const acessoDe = (usuarioId: UsuarioId) => ({ usuarioId, instituicaoId: INSTITUICAO_A as InstituicaoId });

      const resultados = await Promise.all([
        naInstituicaoA(() => desativar.executar(acessoDe(y), { usuarioId: x, versaoEsperada: versaoX, motivo: 'saída' })),
        naInstituicaoA(() =>
          definirGrupos.executar(acessoDe(x), { usuarioId: y, versaoEsperada: versaoY, grupos: [] }),
        ),
      ]);

      expect(resultados.filter(ehOk)).toHaveLength(1);
      expect(resultados.find(ehErr)?.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('recusa tirar o único administrador sem mexer em linha, trilha nem outbox', async () => {
      const grupoAdministrador = await criarGrupoAdministrador();
      const unico = await criarUsuarioAtivo([grupoAdministrador.id]);
      const versao = await versaoDe(unico);
      const { desativar } = montarCasosDeUsoDaGestao(ambiente);
      const trilhaAntes = await contarTrilha(unico);

      const resultado = await naInstituicaoA(() =>
        desativar.executar(
          { usuarioId: AUTOR, instituicaoId: INSTITUICAO_A as InstituicaoId },
          { usuarioId: unico, versaoEsperada: versao, motivo: 'saída' },
        ),
      );

      expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
      expect(await versaoDe(unico)).toBe(versao);
      expect(await contarTrilha(unico)).toBe(trilhaAntes);
    });
  });

  async function contarTrilha(agregadoId: string): Promise<number> {
    const [linha] = await consultarNaInstituicao<{ total: number }>(
      banco,
      INSTITUICAO_A,
      `select (select count(*) from shared.outbox where agregado_id = $1)::int
            + (select count(*) from identidade.registro_de_auditoria where agregado_id = $1)::int as total`,
      [agregadoId],
    );
    return linha!.total;
  }
});
