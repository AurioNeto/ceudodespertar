import { randomUUID } from 'node:crypto';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import {
  novoGrupoNomeado,
  ROTA_PROTEGIDA_POR_PERMISSAO,
  subirAplicacaoDeAcesso,
} from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { eventosDoOutbox, novoUsuarioConvidado } from '../apoio.js';
import {
  efeitosGravados,
  escrever,
  estadoDoUsuario,
  ROTA_USUARIOS,
  semearUsuarios,
  trilhaDoUsuario,
  usuarioAtivoEm,
} from './apoio-http.js';

const ADMIN = 'sub-admin';
const OUTRO_ADMIN = 'sub-outro-admin';
const ALVO = 'sub-alvo';
const SEM_PERMISSAO = 'sub-sem-permissao';
const ADMIN_DE_B = 'sub-admin-de-b';
const MOTIVO = 'afastamento temporário';

const desativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/desativar`;
const reativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/reativar`;
const gruposDe = (id: string) => `${ROTA_USUARIOS}/${id}/grupos`;

describe('gestão de usuários pela API (Doc 3 §11, Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    aplicacao = await subirAplicacaoDeAcesso(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasa() {
    const administracao = novoGrupoNomeado('Administração', ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']);
    const leitura = novoGrupoNomeado('Leitura', ['financeiro.lancamento.ler']);
    const admin = usuarioAtivoEm(ADMIN, [administracao]);
    const outroAdmin = usuarioAtivoEm(OUTRO_ADMIN, [administracao]);
    const alvo = usuarioAtivoEm(ALVO, [leitura]);
    const semPermissao = usuarioAtivoEm(SEM_PERMISSAO, [leitura]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao, leitura], [admin, outroAdmin, alvo, semPermissao]);
    return { administracao, leitura, admin, outroAdmin, alvo, semPermissao };
  }

  async function semearAdministradorUnico() {
    const administracao = novoGrupoNomeado('Administração', ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']);
    const admin = usuarioAtivoEm(ADMIN, [administracao]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [administracao], [admin]);
    return { administracao, admin };
  }

  async function semearCasaDeB() {
    const grupo = novoGrupoNomeado('Administração de B', ['sistema.usuario.gerenciar']);
    const adminDeB = usuarioAtivoEm(ADMIN_DE_B, [grupo]);
    const alvoDeB = usuarioAtivoEm('sub-alvo-de-b', [grupo]);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [grupo], [adminDeB, alvoDeB]);
    return { grupo, alvoDeB };
  }

  const estadoDe = (id: UsuarioId) => estadoDoUsuario(banco, INSTITUICAO_A, id);

  describe('trilha de cada comando', () => {
    it('desativar grava USUARIO_SUSPENSO sensível, com autor, correlação e motivo, sem nome nem e-mail do alvo', async () => {
      const { admin, alvo } = await semearCasa();
      const antes = await estadoDe(alvo.id);

      const resposta = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), { versao: antes.versao, corpo: { motivo: MOTIVO } });

      expect(resposta).toEqual({ status: 200, corpo: { situacao: 'SUSPENSO', versao: antes.versao + 1 } });
      const [registro, ...demais] = await trilhaDoUsuario(banco, INSTITUICAO_A, alvo.id, 'USUARIO_SUSPENSO');
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: true });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).toContain(MOTIVO);
      expect(registro!.detalhes).not.toContain(alvo.nome);
      expect(registro!.detalhes).not.toContain(alvo.email);
      expect(await eventosDoOutbox(banco, alvo.id)).toContain('USUARIO_SUSPENSO');
    });

    it('reativar grava USUARIO_REATIVADO sensível, com autor, correlação e motivo', async () => {
      const { admin, alvo } = await semearCasa();
      const suspenso = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), {
        versao: (await estadoDe(alvo.id)).versao,
        corpo: { motivo: MOTIVO },
      });

      const resposta = await escrever(aplicacao, ADMIN, reativarDe(alvo.id), {
        versao: suspenso.corpo.versao as number,
        corpo: { motivo: 'retorno às atividades' },
      });

      expect(resposta).toEqual({ status: 200, corpo: { situacao: 'ATIVO', versao: (suspenso.corpo.versao as number) + 1 } });
      const [registro, ...demais] = await trilhaDoUsuario(banco, INSTITUICAO_A, alvo.id, 'USUARIO_REATIVADO');
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: true });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).toContain('retorno às atividades');
      expect(registro!.detalhes).not.toContain(alvo.email);
      expect(await eventosDoOutbox(banco, alvo.id)).toContain('USUARIO_REATIVADO');
    });

    it('definir grupos grava GRUPO_ALTERADO com autor e correlação, sem nome nem e-mail do alvo', async () => {
      const { administracao, admin, alvo } = await semearCasa();
      const antes = await estadoDe(alvo.id);

      const resposta = await escrever(aplicacao, ADMIN, gruposDe(alvo.id), {
        metodo: 'PUT',
        versao: antes.versao,
        corpo: { grupos: [administracao.id] },
      });

      expect(resposta).toEqual({ status: 200, corpo: { grupos: [administracao.id], versao: antes.versao + 1 } });
      const [registro, ...demais] = await trilhaDoUsuario(banco, INSTITUICAO_A, alvo.id, 'GRUPO_ALTERADO');
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id, sensivel: false });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).not.toContain(alvo.nome);
      expect(registro!.detalhes).not.toContain(alvo.email);
      expect(await eventosDoOutbox(banco, alvo.id)).toContain('GRUPO_ALTERADO');
      expect((await estadoDe(alvo.id)).grupos).toEqual([administracao.id]);
    });

    it('definir os mesmos grupos responde 200 sem trilha, sem outbox e sem subir a versão', async () => {
      const { leitura, alvo } = await semearCasa();
      const antes = await estadoDe(alvo.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await escrever(aplicacao, ADMIN, gruposDe(alvo.id), {
        metodo: 'PUT',
        versao: antes.versao,
        corpo: { grupos: [leitura.id] },
      });

      expect(resposta).toEqual({ status: 200, corpo: { grupos: [leitura.id], versao: antes.versao } });
      expect(await estadoDe(alvo.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    });
  });

  describe('comando recusado não deixa trilha nem outbox', () => {
    async function esperarRecusaSemEfeitos(
      alvoId: UsuarioId,
      executar: () => Promise<{ status: number; corpo: Record<string, unknown> }>,
      status: number,
      erro: string,
    ): Promise<void> {
      const estadoAntes = await estadoDe(alvoId);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await executar();

      expect(resposta.status).toBe(status);
      expect(resposta.corpo).toMatchObject({ erro });
      expect(await estadoDe(alvoId)).toEqual(estadoAntes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    }

    it('id inexistente na instituição responde 404 RECURSO_NAO_ENCONTRADO', async () => {
      const { alvo } = await semearCasa();

      await esperarRecusaSemEfeitos(
        alvo.id,
        () => escrever(aplicacao, ADMIN, desativarDe(randomUUID()), { versao: 1, corpo: { motivo: MOTIVO } }),
        404,
        'RECURSO_NAO_ENCONTRADO',
      );
    });

    it('desativar convite pendente responde 409 SITUACAO_DO_USUARIO_NAO_PERMITE e não 401', async () => {
      const { administracao } = await semearCasa();
      const convidado = novoUsuarioConvidado([administracao.id]);
      await semearUsuarios(aplicacao, INSTITUICAO_A, [], [convidado]);

      await esperarRecusaSemEfeitos(
        convidado.id,
        async () =>
          escrever(aplicacao, ADMIN, desativarDe(convidado.id), {
            versao: (await estadoDe(convidado.id)).versao,
            corpo: { motivo: MOTIVO },
          }),
        409,
        'SITUACAO_DO_USUARIO_NAO_PERMITE',
      );
    });

    it('versão desatualizada responde 409 VERSAO_DESATUALIZADA', async () => {
      const { alvo } = await semearCasa();
      const { versao } = await estadoDe(alvo.id);

      await esperarRecusaSemEfeitos(
        alvo.id,
        () => escrever(aplicacao, ADMIN, desativarDe(alvo.id), { versao: versao + 1, corpo: { motivo: MOTIVO } }),
        409,
        'VERSAO_DESATUALIZADA',
      );
    });

    it('sem If-Match responde 428 VERSAO_OBRIGATORIA', async () => {
      const { alvo } = await semearCasa();

      await esperarRecusaSemEfeitos(
        alvo.id,
        () => escrever(aplicacao, ADMIN, desativarDe(alvo.id), { corpo: { motivo: MOTIVO } }),
        428,
        'VERSAO_OBRIGATORIA',
      );
    });

    it('If-Match malformado responde 400 CORPO_INVALIDO', async () => {
      const { alvo } = await semearCasa();

      await esperarRecusaSemEfeitos(
        alvo.id,
        () => escrever(aplicacao, ADMIN, desativarDe(alvo.id), { versao: 'abc', corpo: { motivo: MOTIVO } }),
        400,
        'CORPO_INVALIDO',
      );
    });

    it('motivo vazio responde 400 CORPO_INVALIDO', async () => {
      const { alvo } = await semearCasa();

      await esperarRecusaSemEfeitos(
        alvo.id,
        async () =>
          escrever(aplicacao, ADMIN, desativarDe(alvo.id), {
            versao: (await estadoDe(alvo.id)).versao,
            corpo: { motivo: '   ' },
          }),
        400,
        'CORPO_INVALIDO',
      );
    });
  });

  describe('isolamento entre instituições (Doc 3 §11)', () => {
    it('administrador de A com id de usuário de B recebe 404 em cada rota e nada muda em B', async () => {
      const { leitura } = await semearCasa();
      const { alvoDeB } = await semearCasaDeB();
      const antes = await estadoDoUsuario(banco, INSTITUICAO_B, alvoDeB.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_B);

      const respostas = [
        await escrever(aplicacao, ADMIN, desativarDe(alvoDeB.id), { versao: antes.versao, corpo: { motivo: MOTIVO } }),
        await escrever(aplicacao, ADMIN, reativarDe(alvoDeB.id), { versao: antes.versao, corpo: { motivo: MOTIVO } }),
        await escrever(aplicacao, ADMIN, gruposDe(alvoDeB.id), {
          metodo: 'PUT',
          versao: antes.versao,
          corpo: { grupos: [leitura.id] },
        }),
      ];

      for (const resposta of respostas) {
        expect(resposta.status).toBe(404);
        expect(resposta.corpo).toMatchObject({ erro: 'RECURSO_NAO_ENCONTRADO' });
      }
      expect(await estadoDoUsuario(banco, INSTITUICAO_B, alvoDeB.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_B)).toEqual(efeitosAntes);
    });

    it('grupoId de B no corpo do PUT responde GRUPO_INEXISTENTE e nunca 500', async () => {
      const { alvo } = await semearCasa();
      const { grupo: grupoDeB } = await semearCasaDeB();
      const antes = await estadoDe(alvo.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await escrever(aplicacao, ADMIN, gruposDe(alvo.id), {
        metodo: 'PUT',
        versao: antes.versao,
        corpo: { grupos: [grupoDeB.id] },
      });

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'GRUPO_INEXISTENTE' });
      expect(await estadoDe(alvo.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    });

    it('grupoId que não existe em lugar nenhum também responde GRUPO_INEXISTENTE', async () => {
      const { alvo } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, gruposDe(alvo.id), {
        metodo: 'PUT',
        versao: (await estadoDe(alvo.id)).versao,
        corpo: { grupos: [randomUUID() as GrupoId] },
      });

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'GRUPO_INEXISTENTE' });
    });
  });

  describe('T25 · último administrador (Doc 3 §11)', () => {
    async function esperarUltimoAdministrador(
      alvoId: UsuarioId,
      executar: () => Promise<{ status: number; corpo: Record<string, unknown> }>,
      permissao: string,
    ): Promise<void> {
      const estadoAntes = await estadoDe(alvoId);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await executar();

      expect(resposta.status).toBe(422);
      expect(resposta.corpo).toMatchObject({ erro: 'ULTIMO_ADMINISTRADOR' });
      expect(JSON.stringify(resposta.corpo)).toContain(permissao);
      expect(await estadoDe(alvoId)).toEqual(estadoAntes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    }

    it('desativar o único administrador responde 422 ULTIMO_ADMINISTRADOR com estado, trilha e outbox inalterados', async () => {
      const { admin } = await semearAdministradorUnico();

      await esperarUltimoAdministrador(
        admin.id,
        async () =>
          escrever(aplicacao, ADMIN, desativarDe(admin.id), {
            versao: (await estadoDe(admin.id)).versao,
            corpo: { motivo: MOTIVO },
          }),
        'sistema.usuario.gerenciar',
      );
    });

    it('definir grupos sem o grupo administrador do único administrador responde 422 ULTIMO_ADMINISTRADOR', async () => {
      const { admin } = await semearAdministradorUnico();

      await esperarUltimoAdministrador(
        admin.id,
        async () =>
          escrever(aplicacao, ADMIN, gruposDe(admin.id), {
            metodo: 'PUT',
            versao: (await estadoDe(admin.id)).versao,
            corpo: { grupos: [] },
          }),
        'sistema.usuario.gerenciar',
      );
    });

    it('com dois administradores desativar um deles responde 200', async () => {
      const { outroAdmin } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, desativarDe(outroAdmin.id), {
        versao: (await estadoDe(outroAdmin.id)).versao,
        corpo: { motivo: MOTIVO },
      });

      expect(resposta.status).toBe(200);
      expect((await estadoDe(outroAdmin.id)).situacao).toBe('SUSPENSO');
    });

    it('com dois administradores definir grupos sem o grupo administrador de um deles responde 200', async () => {
      const { outroAdmin } = await semearCasa();

      const resposta = await escrever(aplicacao, ADMIN, gruposDe(outroAdmin.id), {
        metodo: 'PUT',
        versao: (await estadoDe(outroAdmin.id)).versao,
        corpo: { grupos: [] },
      });

      expect(resposta.status).toBe(200);
      expect((await estadoDe(outroAdmin.id)).grupos).toEqual([]);
    });

    describe('sistema.grupo.gerenciar', () => {
      async function semearGerentesDeUsuariosEDeGrupos(gerentesDeGrupos: number) {
        const deUsuarios = novoGrupoNomeado('Gestão de usuários', ['sistema.usuario.gerenciar']);
        const deGrupos = novoGrupoNomeado('Gestão de grupos', ['sistema.grupo.gerenciar']);
        const gerenteDeUsuarios = usuarioAtivoEm(ADMIN, [deUsuarios]);
        const gerentes = Array.from({ length: gerentesDeGrupos }, (_, indice) =>
          usuarioAtivoEm(`sub-gerente-de-grupos-${indice}`, [deGrupos]),
        );
        await semearUsuarios(aplicacao, INSTITUICAO_A, [deUsuarios, deGrupos], [gerenteDeUsuarios, ...gerentes]);
        return gerentes;
      }

      it('desativar o único com a permissão responde 422 ULTIMO_ADMINISTRADOR', async () => {
        const [gerente] = await semearGerentesDeUsuariosEDeGrupos(1);

        await esperarUltimoAdministrador(
          gerente!.id,
          async () =>
            escrever(aplicacao, ADMIN, desativarDe(gerente!.id), {
              versao: (await estadoDe(gerente!.id)).versao,
              corpo: { motivo: MOTIVO },
            }),
          'sistema.grupo.gerenciar',
        );
      });

      it('definir grupos sem o grupo do único com a permissão responde 422 ULTIMO_ADMINISTRADOR', async () => {
        const [gerente] = await semearGerentesDeUsuariosEDeGrupos(1);

        await esperarUltimoAdministrador(
          gerente!.id,
          async () =>
            escrever(aplicacao, ADMIN, gruposDe(gerente!.id), {
              metodo: 'PUT',
              versao: (await estadoDe(gerente!.id)).versao,
              corpo: { grupos: [] },
            }),
          'sistema.grupo.gerenciar',
        );
      });

      it('com dois com a permissão, desativar um deles e definir grupos do outro: o primeiro passa e o segundo é recusado', async () => {
        const [primeiro, segundo] = await semearGerentesDeUsuariosEDeGrupos(2);

        const desativado = await escrever(aplicacao, ADMIN, desativarDe(primeiro!.id), {
          versao: (await estadoDe(primeiro!.id)).versao,
          corpo: { motivo: MOTIVO },
        });
        const recusado = await escrever(aplicacao, ADMIN, gruposDe(segundo!.id), {
          metodo: 'PUT',
          versao: (await estadoDe(segundo!.id)).versao,
          corpo: { grupos: [] },
        });

        expect(desativado.status).toBe(200);
        expect(recusado.status).toBe(422);
        expect(recusado.corpo).toMatchObject({ erro: 'ULTIMO_ADMINISTRADOR' });
      });
    });
  });

  describe('If-Match', () => {
    it('versão correta responde 200 com a versão incrementada', async () => {
      const { alvo } = await semearCasa();
      const { versao } = await estadoDe(alvo.id);

      const resposta = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), { versao, corpo: { motivo: MOTIVO } });

      expect(resposta).toEqual({ status: 200, corpo: { situacao: 'SUSPENSO', versao: versao + 1 } });
      expect((await estadoDe(alvo.id)).versao).toBe(versao + 1);
    });

    it('versão entre aspas, como em ETag, também é aceita', async () => {
      const { alvo } = await semearCasa();
      const { versao } = await estadoDe(alvo.id);

      const resposta = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), {
        versao: `"${versao}"`,
        corpo: { motivo: MOTIVO },
      });

      expect(resposta.status).toBe(200);
    });
  });

  describe('Idempotency-Key no POST', () => {
    it('a mesma chave repetida produz um único efeito e devolve a mesma resposta', async () => {
      const { alvo } = await semearCasa();
      const { versao } = await estadoDe(alvo.id);
      const chave = randomUUID();
      const pedido = { versao, corpo: { motivo: MOTIVO }, chave };

      const primeira = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), pedido);
      const segunda = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), pedido);

      expect(primeira.status).toBe(200);
      expect(segunda).toEqual(primeira);
      expect(await trilhaDoUsuario(banco, INSTITUICAO_A, alvo.id, 'USUARIO_SUSPENSO')).toHaveLength(1);
      expect((await eventosDoOutbox(banco, alvo.id)).filter((tipo) => tipo === 'USUARIO_SUSPENSO')).toHaveLength(1);
      expect((await estadoDe(alvo.id)).versao).toBe(versao + 1);
    });

    it('a mesma chave com corpo diferente responde 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA', async () => {
      const { alvo } = await semearCasa();
      const { versao } = await estadoDe(alvo.id);
      const chave = randomUUID();
      await escrever(aplicacao, ADMIN, desativarDe(alvo.id), { versao, corpo: { motivo: MOTIVO }, chave });

      const reutilizada = await escrever(aplicacao, ADMIN, desativarDe(alvo.id), {
        versao,
        corpo: { motivo: 'outro motivo' },
        chave,
      });

      expect(reutilizada.status).toBe(422);
      expect(reutilizada.corpo).toMatchObject({ erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' });
      expect(await trilhaDoUsuario(banco, INSTITUICAO_A, alvo.id, 'USUARIO_SUSPENSO')).toHaveLength(1);
    });
  });

  describe('autorização', () => {
    it('sem sistema.usuario.gerenciar responde 403 SEM_PERMISSAO em cada rota e nada muda', async () => {
      const { leitura, alvo } = await semearCasa();
      const antes = await estadoDe(alvo.id);
      const efeitosAntes = await efeitosGravados(banco, INSTITUICAO_A);

      const respostas = [
        await escrever(aplicacao, SEM_PERMISSAO, desativarDe(alvo.id), { versao: antes.versao, corpo: { motivo: MOTIVO } }),
        await escrever(aplicacao, SEM_PERMISSAO, reativarDe(alvo.id), { versao: antes.versao, corpo: { motivo: MOTIVO } }),
        await escrever(aplicacao, SEM_PERMISSAO, gruposDe(alvo.id), {
          metodo: 'PUT',
          versao: antes.versao,
          corpo: { grupos: [leitura.id] },
        }),
      ];

      for (const resposta of respostas) {
        expect(resposta.status).toBe(403);
        expect(resposta.corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
      }
      expect(await estadoDe(alvo.id)).toEqual(antes);
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitosAntes);
    });

    it('definir grupos invalida o cache de acesso: o usuário afetado perde a permissão na requisição seguinte', async () => {
      const { alvo } = await semearCasa();
      expect((await aplicacao.pedirComo(ALVO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      await escrever(aplicacao, ADMIN, gruposDe(alvo.id), {
        metodo: 'PUT',
        versao: (await estadoDe(alvo.id)).versao,
        corpo: { grupos: [] },
      });
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(ALVO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(403);
    });

    it('desativar invalida o cache de acesso: o usuário afetado recebe 401 na requisição seguinte', async () => {
      const { alvo } = await semearCasa();
      expect((await aplicacao.pedirComo(ALVO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(200);

      await escrever(aplicacao, ADMIN, desativarDe(alvo.id), {
        versao: (await estadoDe(alvo.id)).versao,
        corpo: { motivo: MOTIVO },
      });
      await aplicacao.entregarEventos();

      expect((await aplicacao.pedirComo(ALVO, ROTA_PROTEGIDA_POR_PERMISSAO)).status).toBe(401);
    });
  });
});
