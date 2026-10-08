import { randomUUID } from 'node:crypto';
import type { GrupoId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Grupo } from '../../../src/modules/identidade/domain/grupo/grupo.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import {
  novoGrupoNomeado,
  ROTA_PROTEGIDA_POR_PERMISSAO,
  subirAplicacaoDeAcesso,
} from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { AUTOR, consultarNaInstituicao, eventosDoOutbox } from '../apoio.js';
import { apoioDaTrava } from '../gestao-de-usuarios/apoio-da-trava.js';
import type { ApoioDaTrava } from '../gestao-de-usuarios/apoio-da-trava.js';
import {
  efeitosGravados,
  escrever,
  ROTA_USUARIOS,
  semearUsuarios,
  usuarioAtivoEm,
} from '../gestao-de-usuarios/apoio-http.js';
import type { RespostaDeEscrita } from '../gestao-de-usuarios/apoio-http.js';
import { estadoDoGrupo, rotaDaPermissaoDoGrupo, rotaDoGrupo, ROTA_GRUPOS, trilhaDoGrupo } from './apoio-http.js';

const ADMIN = 'sub-admin';
const MEMBRO = 'sub-membro';
const OUTRO_MEMBRO = 'sub-outro-membro';
const ADMIN_DE_B = 'sub-admin-de-b';
const GERENTE_DE_USUARIOS = 'sub-gerente-de-usuarios';
const GERENTE_DE_GRUPOS = 'sub-gerente-de-grupos';
const PERMISSOES_DA_ADMINISTRACAO = ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'] as const;
const PERMISSAO_DA_LEITURA = 'financeiro.lancamento.ler';

const desativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/desativar`;

describe('gestão de grupos pela API (Doc 3 §11, Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let trava: ApoioDaTrava;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    aplicacao = await subirAplicacaoDeAcesso(banco);
    trava = apoioDaTrava(banco, INSTITUICAO_A);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasa() {
    const administracao = novoGrupoNomeado('Administração', PERMISSOES_DA_ADMINISTRACAO);
    const leitura = novoGrupoNomeado('Leitura', [PERMISSAO_DA_LEITURA]);
    const admin = usuarioAtivoEm(ADMIN, [administracao]);
    const membro = usuarioAtivoEm(MEMBRO, [leitura]);
    const outroMembro = usuarioAtivoEm(OUTRO_MEMBRO, [leitura]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao, leitura], [admin, membro, outroMembro]);
    return { administracao, leitura, admin, membro, outroMembro };
  }

  async function semearAdministradorUnico() {
    const administracao = novoGrupoNomeado('Administração', PERMISSOES_DA_ADMINISTRACAO);
    const admin = usuarioAtivoEm(ADMIN, [administracao]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao], [admin]);
    return { administracao };
  }

  async function semearCasaDeB() {
    const grupo = novoGrupoNomeado('Administração de B', PERMISSOES_DA_ADMINISTRACAO);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [grupo], [usuarioAtivoEm(ADMIN_DE_B, [grupo])]);
    return { grupo };
  }

  const estadoDe = (id: GrupoId) => estadoDoGrupo(banco, INSTITUICAO_A, id);
  const conceder = (sujeito: string, grupoId: string, permissao: string, versao?: number | string) =>
    escrever(aplicacao, sujeito, rotaDaPermissaoDoGrupo(grupoId, permissao), { metodo: 'PUT', versao });
  const revogar = (sujeito: string, grupoId: string, permissao: string, versao?: number | string) =>
    escrever(aplicacao, sujeito, rotaDaPermissaoDoGrupo(grupoId, permissao), { metodo: 'DELETE', versao });
  const renomear = (sujeito: string, grupoId: string, corpo: unknown, versao?: number | string) =>
    escrever(aplicacao, sujeito, rotaDoGrupo(grupoId), { metodo: 'PATCH', versao, corpo });

  describe('trilha de cada comando', () => {
    it('conceder grava GRUPO_EDITADO com autor e correlação e devolve as permissões com a nova versão', async () => {
      const { leitura, admin } = await semearCasa();
      const antes = await estadoDe(leitura.id);

      const resposta = await conceder(ADMIN, leitura.id, 'pessoas.pessoa.ler', antes.versao);

      expect(resposta).toEqual({
        status: 200,
        corpo: { permissoes: [PERMISSAO_DA_LEITURA, 'pessoas.pessoa.ler'], versao: antes.versao + 1 },
      });
      const [registro, ...demais] = await trilhaDoGrupo(banco, INSTITUICAO_A, leitura.id);
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: false });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).toContain('pessoas.pessoa.ler');
      expect(await eventosDoOutbox(banco, leitura.id)).toContain('GRUPO_EDITADO');
      expect((await estadoDe(leitura.id)).permissoes).toEqual([PERMISSAO_DA_LEITURA, 'pessoas.pessoa.ler']);
    });

    it('revogar grava GRUPO_EDITADO com autor e correlação e devolve as permissões restantes', async () => {
      const { leitura, admin } = await semearCasa();
      const antes = await estadoDe(leitura.id);

      const resposta = await revogar(ADMIN, leitura.id, PERMISSAO_DA_LEITURA, antes.versao);

      expect(resposta).toEqual({ status: 200, corpo: { permissoes: [], versao: antes.versao + 1 } });
      const [registro, ...demais] = await trilhaDoGrupo(banco, INSTITUICAO_A, leitura.id);
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: false });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).toContain(PERMISSAO_DA_LEITURA);
      expect(await eventosDoOutbox(banco, leitura.id)).toContain('GRUPO_EDITADO');
      expect((await estadoDe(leitura.id)).permissoes).toEqual([]);
    });

    it('renomear grava GRUPO_EDITADO com autor e correlação e devolve o grupo com a nova versão', async () => {
      const { leitura, admin } = await semearCasa();
      const antes = await estadoDe(leitura.id);

      const resposta = await renomear(ADMIN, leitura.id, { nome: 'Somente leitura', descricao: 'Acesso de consulta' }, antes.versao);

      expect(resposta).toEqual({
        status: 200,
        corpo: {
          id: leitura.id,
          codigoSistema: null,
          nome: 'Somente leitura',
          descricao: 'Acesso de consulta',
          permissoes: [PERMISSAO_DA_LEITURA],
          protegido: false,
          versao: antes.versao + 1,
        },
      });
      const [registro, ...demais] = await trilhaDoGrupo(banco, INSTITUICAO_A, leitura.id);
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: false });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(await eventosDoOutbox(banco, leitura.id)).toContain('GRUPO_EDITADO');
      expect(await estadoDe(leitura.id)).toMatchObject({ nome: 'Somente leitura', descricao: 'Acesso de consulta' });
    });
  });

  describe('comando sem efeito responde 200 sem trilha, sem outbox e sem subir a versão', () => {
    async function esperarSemEfeito(grupoId: GrupoId, executar: (versao: number) => Promise<RespostaDeEscrita>) {
      const antes = await estadoDe(grupoId);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await executar(antes.versao);

      expect(resposta.status).toBe(200);
      expect(resposta.corpo.versao).toBe(antes.versao);
      expect(await estadoDe(grupoId)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    }

    it('conceder permissão já concedida', async () => {
      const { leitura } = await semearCasa();

      await esperarSemEfeito(leitura.id, (versao) => conceder(ADMIN, leitura.id, PERMISSAO_DA_LEITURA, versao));
    });

    it('revogar permissão que o grupo não tem', async () => {
      const { leitura } = await semearCasa();

      await esperarSemEfeito(leitura.id, (versao) => revogar(ADMIN, leitura.id, 'pessoas.pessoa.ler', versao));
    });

    it('renomear com o mesmo nome e a mesma descrição', async () => {
      const { leitura } = await semearCasa();

      await esperarSemEfeito(leitura.id, (versao) =>
        renomear(ADMIN, leitura.id, { nome: 'Leitura', descricao: 'Grupo de teste' }, versao),
      );
    });
  });

  describe('comando recusado não deixa trilha nem outbox', () => {
    async function esperarRecusaSemEfeitos(
      grupoId: GrupoId,
      executar: () => Promise<RespostaDeEscrita>,
      status: number,
      erro: string,
    ): Promise<void> {
      const estadoAntes = await estadoDe(grupoId);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await executar();

      expect(resposta.status).toBe(status);
      expect(resposta.corpo).toMatchObject({ erro });
      expect(await estadoDe(grupoId)).toEqual(estadoAntes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    }

    it('grupo inexistente na instituição responde 404 RECURSO_NAO_ENCONTRADO', async () => {
      const { leitura } = await semearCasa();

      await esperarRecusaSemEfeitos(
        leitura.id,
        () => conceder(ADMIN, randomUUID(), 'pessoas.pessoa.ler', 1),
        404,
        'RECURSO_NAO_ENCONTRADO',
      );
    });

    it('escrita em grupo excluído responde 404 GRUPO_INEXISTENTE nas três rotas', async () => {
      await semearCasa();
      const excluido = novoGrupoNomeado('Excluído', [PERMISSAO_DA_LEITURA]);
      await semearUsuarios(aplicacao, INSTITUICAO_A, [excluido], [usuarioAtivoEm('sub-qualquer', [])]);
      await comContexto(INSTITUICAO_A, async () => {
        const grupo = (await aplicacao.grupos.porId(excluido.id))!;
        grupo.excluir(0, AUTOR, new Date());
        await aplicacao.grupos.salvar(grupo);
      });
      const { versao } = await estadoDe(excluido.id);

      await esperarRecusaSemEfeitos(
        excluido.id,
        () => conceder(ADMIN, excluido.id, 'pessoas.pessoa.ler', versao),
        404,
        'GRUPO_INEXISTENTE',
      );
      await esperarRecusaSemEfeitos(
        excluido.id,
        () => revogar(ADMIN, excluido.id, PERMISSAO_DA_LEITURA, versao),
        404,
        'GRUPO_INEXISTENTE',
      );
      await esperarRecusaSemEfeitos(
        excluido.id,
        () => renomear(ADMIN, excluido.id, { nome: 'Outro', descricao: '' }, versao),
        404,
        'GRUPO_INEXISTENTE',
      );
    });

    it('permissão fora do catálogo no path responde 404 PERMISSAO_INEXISTENTE ao conceder e ao revogar', async () => {
      const { leitura } = await semearCasa();
      const { versao } = await estadoDe(leitura.id);

      await esperarRecusaSemEfeitos(
        leitura.id,
        () => conceder(ADMIN, leitura.id, 'inventada.coisa.fazer', versao),
        404,
        'PERMISSAO_INEXISTENTE',
      );
      await esperarRecusaSemEfeitos(
        leitura.id,
        () => revogar(ADMIN, leitura.id, 'inventada.coisa.fazer', versao),
        404,
        'PERMISSAO_INEXISTENTE',
      );
    });

    it('renomear para o nome de outro grupo, mesmo em caixa diferente, responde 409 GRUPO_JA_EXISTE e não 500', async () => {
      const { leitura } = await semearCasa();
      const { versao } = await estadoDe(leitura.id);

      await esperarRecusaSemEfeitos(
        leitura.id,
        () => renomear(ADMIN, leitura.id, { nome: 'ADMINISTRAÇÃO', descricao: 'Grupo de teste' }, versao),
        409,
        'GRUPO_JA_EXISTE',
      );
    });

    it('nome vazio ou só com espaços responde 400 CORPO_INVALIDO', async () => {
      const { leitura } = await semearCasa();
      const { versao } = await estadoDe(leitura.id);

      await esperarRecusaSemEfeitos(
        leitura.id,
        () => renomear(ADMIN, leitura.id, { nome: '   ', descricao: '' }, versao),
        400,
        'CORPO_INVALIDO',
      );
    });

    it('versão desatualizada responde 409 VERSAO_DESATUALIZADA nas três rotas', async () => {
      const { leitura } = await semearCasa();
      const { versao } = await estadoDe(leitura.id);
      const desatualizada = versao + 1;

      await esperarRecusaSemEfeitos(leitura.id, () => conceder(ADMIN, leitura.id, 'pessoas.pessoa.ler', desatualizada), 409, 'VERSAO_DESATUALIZADA');
      await esperarRecusaSemEfeitos(leitura.id, () => revogar(ADMIN, leitura.id, PERMISSAO_DA_LEITURA, desatualizada), 409, 'VERSAO_DESATUALIZADA');
      await esperarRecusaSemEfeitos(
        leitura.id,
        () => renomear(ADMIN, leitura.id, { nome: 'Outro', descricao: '' }, desatualizada),
        409,
        'VERSAO_DESATUALIZADA',
      );
    });

    it('sem If-Match responde 428 VERSAO_OBRIGATORIA nas três rotas', async () => {
      const { leitura } = await semearCasa();

      await esperarRecusaSemEfeitos(leitura.id, () => conceder(ADMIN, leitura.id, 'pessoas.pessoa.ler'), 428, 'VERSAO_OBRIGATORIA');
      await esperarRecusaSemEfeitos(leitura.id, () => revogar(ADMIN, leitura.id, PERMISSAO_DA_LEITURA), 428, 'VERSAO_OBRIGATORIA');
      await esperarRecusaSemEfeitos(
        leitura.id,
        () => renomear(ADMIN, leitura.id, { nome: 'Outro', descricao: '' }),
        428,
        'VERSAO_OBRIGATORIA',
      );
    });

    it('If-Match malformado responde 400 CORPO_INVALIDO', async () => {
      const { leitura } = await semearCasa();

      await esperarRecusaSemEfeitos(leitura.id, () => conceder(ADMIN, leitura.id, 'pessoas.pessoa.ler', 'abc'), 400, 'CORPO_INVALIDO');
    });
  });

  describe('grupo protegido (Doc 3 §11, G5)', () => {
    async function semearCasaComGrupoProtegido() {
      const protegido = Grupo.criar({
        id: randomUUID() as GrupoId,
        codigoSistema: 'LEITURA',
        nome: 'Leitura de sistema',
        descricao: 'Grupo de sistema',
        protegido: true,
        permissoes: [PERMISSAO_DA_LEITURA],
      });
      if (protegido.tipo === 'erro') throw new Error(protegido.erro.codigo);
      const administracao = novoGrupoNomeado('Administração', PERMISSOES_DA_ADMINISTRACAO);
      await semearUsuarios(
        aplicacao,
        INSTITUICAO_A,
        [administracao, protegido.valor],
        [usuarioAtivoEm(ADMIN, [administracao])],
      );
      return protegido.valor;
    }

    it('renomear, conceder e revogar são permitidos', async () => {
      const protegido = await semearCasaComGrupoProtegido();

      const renomeado = await renomear(ADMIN, protegido.id, { nome: 'Consulta', descricao: 'Nova descrição' }, (await estadoDe(protegido.id)).versao);
      const concedido = await conceder(ADMIN, protegido.id, 'pessoas.pessoa.ler', (await estadoDe(protegido.id)).versao);
      const revogado = await revogar(ADMIN, protegido.id, PERMISSAO_DA_LEITURA, (await estadoDe(protegido.id)).versao);

      expect([renomeado.status, concedido.status, revogado.status]).toEqual([200, 200, 200]);
      expect(await estadoDe(protegido.id)).toMatchObject({ nome: 'Consulta', permissoes: ['pessoas.pessoa.ler'] });
    });
  });

  describe('isolamento entre instituições (Doc 3 §11, T23)', () => {
    it('administrador de A com id de grupo de B recebe 404 em cada rota e nada muda em B', async () => {
      await semearCasa();
      const { grupo: grupoDeB } = await semearCasaDeB();
      const antes = await estadoDoGrupo(banco, INSTITUICAO_B, grupoDeB.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_B);

      const respostas = [
        await conceder(ADMIN, grupoDeB.id, 'pessoas.pessoa.ler', antes.versao),
        await revogar(ADMIN, grupoDeB.id, 'sistema.grupo.gerenciar', antes.versao),
        await renomear(ADMIN, grupoDeB.id, { nome: 'Invadido', descricao: '' }, antes.versao),
      ];

      for (const resposta of respostas) {
        expect(resposta.status).toBe(404);
        expect(resposta.corpo).toMatchObject({ erro: 'RECURSO_NAO_ENCONTRADO' });
      }
      expect(await estadoDoGrupo(banco, INSTITUICAO_B, grupoDeB.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_B)).toEqual(efeitosAntes);
    });

    it('a listagem de A não traz grupos de B', async () => {
      await semearCasa();
      const { grupo: grupoDeB } = await semearCasaDeB();

      const resposta = await aplicacao.pedirComo(ADMIN, ROTA_GRUPOS);
      const { itens } = (await resposta.json()) as { itens: { id: string }[] };

      expect(itens.map(({ id }) => id)).not.toContain(grupoDeB.id);
    });
  });

  describe('último administrador pelo caminho do grupo (Doc 3 §11, T25)', () => {
    it.each(PERMISSOES_DA_ADMINISTRACAO)(
      'revogar %s do único grupo que a tem responde 422 ULTIMO_ADMINISTRADOR com estado, trilha e outbox inalterados',
      async (permissao) => {
        const { administracao } = await semearAdministradorUnico();
        const estadoAntes = await estadoDe(administracao.id);
        const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

        const resposta = await revogar(ADMIN, administracao.id, permissao, estadoAntes.versao);

        expect(resposta.status).toBe(422);
        expect(resposta.corpo).toMatchObject({ erro: 'ULTIMO_ADMINISTRADOR' });
        expect(JSON.stringify(resposta.corpo)).toContain(permissao);
        expect(await estadoDe(administracao.id)).toEqual(estadoAntes);
        expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
      },
    );

    it.each(PERMISSOES_DA_ADMINISTRACAO)(
      'revogar %s responde 200 quando outro grupo administrador mantém a permissão',
      async (permissao) => {
        const { administracao } = await semearAdministradorUnico();
        const segundaAdministracao = novoGrupoNomeado('Segunda administração', PERMISSOES_DA_ADMINISTRACAO);
        await semearUsuarios(
          aplicacao,
          INSTITUICAO_A,
          [segundaAdministracao],
          [usuarioAtivoEm('sub-segundo-admin', [segundaAdministracao])],
        );

        const resposta = await revogar(ADMIN, administracao.id, permissao, (await estadoDe(administracao.id)).versao);

        expect(resposta.status).toBe(200);
        expect((await estadoDe(administracao.id)).permissoes).not.toContain(permissao);
      },
    );

    it('revogar de um grupo sem usuário ativo que dependa dele responde 200', async () => {
      const { administracao } = await semearAdministradorUnico();
      const semMembros = novoGrupoNomeado('Sem membros', ['sistema.usuario.gerenciar']);
      await semearUsuarios(aplicacao, INSTITUICAO_A, [semMembros], [usuarioAtivoEm('sub-qualquer', [])]);

      const resposta = await revogar(ADMIN, semMembros.id, 'sistema.usuario.gerenciar', (await estadoDe(semMembros.id)).versao);

      expect(resposta.status).toBe(200);
      expect((await estadoDe(administracao.id)).permissoes).toEqual([...PERMISSOES_DA_ADMINISTRACAO].toSorted());
    });
  });

  describe('corrida grupo × usuário (Doc 3 §11, T25)', () => {
    async function administradoresAtivosCom(permissao: string): Promise<number> {
      const [linha] = await consultarNaInstituicao<{ total: number }>(
        banco,
        INSTITUICAO_A,
        `select count(distinct u.id)::int as total
           from identidade.usuario u
           join identidade.usuario_grupo ug on ug.usuario_id = u.id
           join identidade.grupo_permissao gp on gp.grupo_id = ug.grupo_id
          where u.situacao = 'ATIVO' and gp.permissao = $1`,
        [permissao],
      );
      return linha!.total;
    }

    it.each(PERMISSOES_DA_ADMINISTRACAO)(
      'revogar %s do grupo de X em paralelo com desativar Y, que só a tem pelo outro grupo, deixa exatamente um administrador',
      async (permissao) => {
        const grupoDeX = novoGrupoNomeado('Administração de X', PERMISSOES_DA_ADMINISTRACAO);
        const grupoDeY = novoGrupoNomeado('Administração de Y', PERMISSOES_DA_ADMINISTRACAO);
        const x = usuarioAtivoEm('sub-administrador-x', [grupoDeX]);
        const y = usuarioAtivoEm('sub-administrador-y', [grupoDeY]);
        await semearUsuarios(aplicacao, INSTITUICAO_A, [grupoDeX, grupoDeY], [x, y]);
        const versaoDoGrupoDeX = (await estadoDe(grupoDeX.id)).versao;
        const versaoDeY = (
          await consultarNaInstituicao<{ versao: number }>(banco, INSTITUICAO_A, 'select versao from identidade.usuario where id = $1', [y.id])
        )[0]!.versao;

        const respostas = await trava.dispararComATravaSegura([
          () => revogar('sub-administrador-y', grupoDeX.id, permissao, versaoDoGrupoDeX),
          () =>
            escrever(aplicacao, 'sub-administrador-x', desativarDe(y.id), {
              versao: versaoDeY,
              corpo: { motivo: 'afastamento temporário' },
            }),
        ]);

        expect(respostas.map(({ status }) => status).toSorted()).toEqual([200, 422]);
        expect(respostas.find(({ status }) => status === 422)!.corpo).toMatchObject({ erro: 'ULTIMO_ADMINISTRADOR' });
        expect(await administradoresAtivosCom(permissao)).toBe(1);
      },
    );
  });

  describe('autorização', () => {
    it('sem sistema.grupo.gerenciar responde 403 SEM_PERMISSAO em cada rota de escrita e nada muda', async () => {
      const { leitura } = await semearCasa();
      const antes = await estadoDe(leitura.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const respostas = [
        await conceder(MEMBRO, leitura.id, 'pessoas.pessoa.ler', antes.versao),
        await revogar(MEMBRO, leitura.id, PERMISSAO_DA_LEITURA, antes.versao),
        await renomear(MEMBRO, leitura.id, { nome: 'Outro', descricao: '' }, antes.versao),
      ];

      for (const resposta of respostas) {
        expect(resposta.status).toBe(403);
        expect(resposta.corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
      }
      expect(await estadoDe(leitura.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    });

    it('só sistema.usuario.gerenciar não basta para escrever em grupo: 403 em cada rota e nada muda', async () => {
      const gerentes = novoGrupoNomeado('Gestão de usuários', ['sistema.usuario.gerenciar']);
      const { leitura } = await semearCasa();
      await semearUsuarios(aplicacao, INSTITUICAO_A, [gerentes], [usuarioAtivoEm(GERENTE_DE_USUARIOS, [gerentes])]);
      const antes = await estadoDe(leitura.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const respostas = [
        await conceder(GERENTE_DE_USUARIOS, leitura.id, 'pessoas.pessoa.ler', antes.versao),
        await revogar(GERENTE_DE_USUARIOS, leitura.id, PERMISSAO_DA_LEITURA, antes.versao),
        await renomear(GERENTE_DE_USUARIOS, leitura.id, { nome: 'Outro', descricao: '' }, antes.versao),
      ];

      for (const resposta of respostas) {
        expect(resposta.status).toBe(403);
        expect(resposta.corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
      }
      expect(await estadoDe(leitura.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    });

    it('revogar a permissão do grupo invalida o cache de acesso dos membros: o acesso cai na requisição seguinte', async () => {
      const { leitura } = await semearCasa();
      expect((await aplicacao.pedirComo(MEMBRO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      await revogar(ADMIN, leitura.id, PERMISSAO_DA_LEITURA, (await estadoDe(leitura.id)).versao);
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(MEMBRO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(403);
    });
  });

  describe('GET /identidade/grupos', () => {
    it('lista os grupos ativos com permissões, versão e a contagem de usuários ativos', async () => {
      const { administracao, leitura, outroMembro } = await semearCasa();
      await escrever(aplicacao, ADMIN, desativarDe(outroMembro.id), {
        versao: 1,
        corpo: { motivo: 'afastamento temporário' },
      });

      const resposta = await aplicacao.pedirComo(ADMIN, ROTA_GRUPOS);

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({
        itens: [
          {
            id: administracao.id,
            codigoSistema: null,
            nome: 'Administração',
            descricao: 'Grupo de teste',
            permissoes: [...PERMISSOES_DA_ADMINISTRACAO].toSorted(),
            protegido: false,
            usuarios: 1,
            versao: 1,
          },
          {
            id: leitura.id,
            codigoSistema: null,
            nome: 'Leitura',
            descricao: 'Grupo de teste',
            permissoes: [PERMISSAO_DA_LEITURA],
            protegido: false,
            usuarios: 1,
            versao: 1,
          },
        ],
      });
    });

    it('ordena por nome sem distinguir maiúsculas de minúsculas mesmo com collation binária', async () => {
      await banco.owner.query('ALTER TABLE identidade.grupo ALTER COLUMN nome TYPE text COLLATE "C"');
      await semearCasa();
      const minusculo = novoGrupoNomeado('beta', [PERMISSAO_DA_LEITURA]);
      const maiusculoSemAcento = novoGrupoNomeado('Alfa', [PERMISSAO_DA_LEITURA]);
      const minusculoDepois = novoGrupoNomeado('alfa2', [PERMISSAO_DA_LEITURA]);
      await semearUsuarios(
        aplicacao,
        INSTITUICAO_A,
        [minusculo, maiusculoSemAcento, minusculoDepois],
        [usuarioAtivoEm('sub-qualquer', [])],
      );

      const { itens } = (await (await aplicacao.pedirComo(ADMIN, ROTA_GRUPOS)).json()) as { itens: { nome: string }[] };

      expect(itens.map(({ nome }) => nome)).toEqual(['Administração', 'Alfa', 'alfa2', 'beta', 'Leitura']);
    });

    it('não lista grupo excluído nem as permissões dele', async () => {
      await semearCasa();
      const excluido = novoGrupoNomeado('Excluído', [PERMISSAO_DA_LEITURA]);
      await semearUsuarios(aplicacao, INSTITUICAO_A, [excluido], [usuarioAtivoEm('sub-qualquer', [])]);
      await comContexto(INSTITUICAO_A, async () => {
        const grupo = (await aplicacao.grupos.porId(excluido.id))!;
        grupo.excluir(0, AUTOR, new Date());
        await aplicacao.grupos.salvar(grupo);
      });

      const { itens } = (await (await aplicacao.pedirComo(ADMIN, ROTA_GRUPOS)).json()) as { itens: { id: string }[] };

      expect(itens.map(({ id }) => id)).not.toContain(excluido.id);
    });

    it('aceita sistema.usuario.gerenciar ou sistema.grupo.gerenciar e recusa quem não tem nenhuma das duas', async () => {
      const deUsuarios = novoGrupoNomeado('Gestão de usuários', ['sistema.usuario.gerenciar']);
      const deGrupos = novoGrupoNomeado('Gestão de grupos', ['sistema.grupo.gerenciar']);
      await semearCasa();
      await semearUsuarios(
        aplicacao,
        INSTITUICAO_A,
        [deUsuarios, deGrupos],
        [usuarioAtivoEm(GERENTE_DE_USUARIOS, [deUsuarios]), usuarioAtivoEm(GERENTE_DE_GRUPOS, [deGrupos])],
      );

      const status = [
        (await aplicacao.pedirComo(GERENTE_DE_USUARIOS, ROTA_GRUPOS)).status,
        (await aplicacao.pedirComo(GERENTE_DE_GRUPOS, ROTA_GRUPOS)).status,
        (await aplicacao.pedirComo(MEMBRO, ROTA_GRUPOS)).status,
      ];

      expect(status).toEqual([200, 200, 403]);
    });
  });
});
