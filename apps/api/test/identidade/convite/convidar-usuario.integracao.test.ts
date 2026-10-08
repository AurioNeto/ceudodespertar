import { randomUUID } from 'node:crypto';
import type { UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { VALIDADE_MAXIMA_DO_CONVITE_EM_HORAS } from '../../../src/modules/identidade/domain/usuario/convite.js';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { eventosDoOutbox } from '../apoio.js';
import {
  efeitosGravados,
  escrever,
  estadoDoUsuario,
  ROTA_USUARIOS,
  semearUsuarios,
  trilhaDoUsuario,
  usuarioAtivoEm,
} from '../gestao-de-usuarios/apoio-http.js';
import {
  convitesDoUsuario,
  desativarGrupo,
  enviadorQueSondaOBanco,
  gruposDeSistemaPorCodigo,
  semearGruposDeSistema,
  sha256Hex,
  tudoQueFoiGravadoEmTexto,
} from './apoio-de-convite.js';
import type { EnviadorQueGuardaEnvios } from './apoio-de-convite.js';

const ADMIN = 'sub-admin';
const SEM_PERMISSAO = 'sub-sem-permissao';
const ADMIN_DE_B = 'sub-admin-de-b';
const MILISSEGUNDOS_POR_HORA = 3_600_000;

const PEDIDO = { nome: 'Maria Silva', email: 'maria@casa.org' };

describe('convidar usuário pela API (Doc 3 §11, Doc 7 §25)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let enviador: EnviadorQueGuardaEnvios;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    enviador = enviadorQueSondaOBanco(banco, INSTITUICAO_A);
    aplicacao = await subirAplicacaoDeAcesso(banco, [{ provider: EnviadorDeConvite, valor: enviador }]);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function semearCasa() {
    await semearGruposDeSistema(aplicacao, INSTITUICAO_A);
    const gestao = novoGrupoNomeado('Gestão da casa', ['sistema.usuario.gerenciar']);
    const outro = novoGrupoNomeado('Mutirão', ['financeiro.lancamento.ler']);
    const admin = usuarioAtivoEm(ADMIN, [gestao]);
    const semPermissao = usuarioAtivoEm(SEM_PERMISSAO, [outro]);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [gestao, outro], [admin, semPermissao]);
    return { admin, gestao, outro, leitura: (await gruposDeSistemaPorCodigo(banco, INSTITUICAO_A)).get('LEITURA')! };
  }

  async function semearCasaDeB() {
    const grupo = novoGrupoNomeado('Grupo de B', ['sistema.usuario.gerenciar']);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [grupo], [usuarioAtivoEm(ADMIN_DE_B, [grupo])]);
    return grupo;
  }

  const convidar = (corpo: unknown = PEDIDO, chave?: string, sujeito = ADMIN) =>
    escrever(aplicacao, sujeito, ROTA_USUARIOS, { corpo, ...(chave === undefined ? {} : { chave }) });

  async function convidarEPegarOId(corpo: unknown = PEDIDO): Promise<UsuarioId> {
    const resposta = await convidar(corpo);
    return resposta.corpo.id as UsuarioId;
  }

  describe('resposta', () => {
    it('201 com Location e o usuário convidado no grupo LEITURA, em CONVITE_PENDENTE na versão 1', async () => {
      const { leitura } = await semearCasa();

      const resposta = await aplicacao.pedirComo(ADMIN, ROTA_USUARIOS, { metodo: 'POST', corpo: PEDIDO });
      const corpo = (await resposta.json()) as { id: string };

      expect(resposta.status).toBe(201);
      expect(resposta.headers.get('location')).toBe(`${ROTA_USUARIOS}/${corpo.id}`);
      expect(corpo).toEqual({
        id: expect.any(String),
        nome: 'Maria Silva',
        email: 'maria@casa.org',
        situacao: 'CONVITE_PENDENTE',
        grupos: [{ id: leitura.id, nome: leitura.nome }],
        versao: 1,
      });
      expect(await estadoDoUsuario(banco, INSTITUICAO_A, corpo.id as UsuarioId)).toEqual({
        versao: 1,
        situacao: 'CONVITE_PENDENTE',
        grupos: [leitura.id],
      });
    });

    it('com grupos informados, atribui exatamente esses grupos', async () => {
      const { gestao, outro } = await semearCasa();

      const resposta = await convidar({ ...PEDIDO, grupos: [gestao.id, outro.id] });

      expect(resposta.status).toBe(201);
      expect((resposta.corpo.grupos as Array<{ id: string }>).map(({ id }) => id).toSorted()).toEqual(
        [gestao.id, outro.id].toSorted(),
      );
      const estado = await estadoDoUsuario(banco, INSTITUICAO_A, resposta.corpo.id as UsuarioId);
      expect([...estado.grupos].toSorted()).toEqual([gestao.id, outro.id].toSorted());
    });

    it('convidar direto para o grupo ADMINISTRADOR com só sistema.usuario.gerenciar é permitido', async () => {
      await semearCasa();
      const administrador = (await gruposDeSistemaPorCodigo(banco, INSTITUICAO_A)).get('ADMINISTRADOR')!;

      const resposta = await convidar({ ...PEDIDO, grupos: [administrador.id] });

      expect(resposta.status).toBe(201);
      expect(resposta.corpo.grupos).toEqual([{ id: administrador.id, nome: administrador.nome }]);
    });

    it('grupo de outra instituição dá 404 GRUPO_INEXISTENTE e nada é gravado', async () => {
      await semearCasa();
      const grupoDeB = await semearCasaDeB();
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar({ ...PEDIDO, grupos: [grupoDeB.id] });

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'GRUPO_INEXISTENTE' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toEqual([]);
    });

    it('grupo desativado da própria instituição dá 404 GRUPO_INEXISTENTE e nada é gravado', async () => {
      const { outro } = await semearCasa();
      await desativarGrupo(banco, INSTITUICAO_A, outro.id);
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar({ ...PEDIDO, grupos: [outro.id] });

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'GRUPO_INEXISTENTE' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toEqual([]);
    });

    it('sem grupos e com LEITURA desativado, o padrão falha e nada é gravado', async () => {
      const { leitura } = await semearCasa();
      await desativarGrupo(banco, INSTITUICAO_A, leitura.id);
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar(PEDIDO);

      expect(resposta.status).toBe(404);
      expect(resposta.corpo).toMatchObject({ erro: 'GRUPO_INEXISTENTE' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toEqual([]);
    });

    it('e-mail inválido dá 400 CORPO_INVALIDO', async () => {
      await semearCasa();

      const resposta = await convidar({ nome: 'Maria', email: 'não-é-email' });

      expect(resposta.status).toBe(400);
      expect(resposta.corpo).toMatchObject({ erro: 'CORPO_INVALIDO' });
    });

    it('sem a permissão sistema.usuario.gerenciar dá 403 SEM_PERMISSAO e nada é gravado', async () => {
      await semearCasa();
      const antes = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar(PEDIDO, undefined, SEM_PERMISSAO);

      expect(resposta.status).toBe(403);
      expect(resposta.corpo).toMatchObject({ erro: 'SEM_PERMISSAO' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(antes);
      expect(enviador.enviados).toEqual([]);
    });
  });

  describe('trilha, outbox e token', () => {
    it('grava USUARIO_CONVIDADO na trilha com autor e correlação, sem nome nem e-mail, e no outbox', async () => {
      const { admin } = await semearCasa();

      const id = await convidarEPegarOId();

      const [registro, ...demais] = await trilhaDoUsuario(banco, INSTITUICAO_A, id, 'USUARIO_CONVIDADO');
      expect(demais).toEqual([]);
      expect(registro).toMatchObject({ autor_usuario_id: admin.id });
      expect(registro!.correlacao_id).toEqual(expect.any(String));
      expect(registro!.detalhes).not.toContain(PEDIDO.nome);
      expect(registro!.detalhes).not.toContain(PEDIDO.email);
      expect(await eventosDoOutbox(banco, id)).toContain('USUARIO_CONVIDADO');
    });

    it('envia o convite só depois do commit, com o token em claro e a expiração no limite de validade', async () => {
      await semearCasa();
      const antes = aplicacao.relogio.agora().getTime();

      const id = await convidarEPegarOId();
      await vi.waitFor(() => expect(enviador.instantaneosDoBanco).toHaveLength(1));

      expect(await Promise.all(enviador.instantaneosDoBanco)).toEqual([1]);
      const [envio] = enviador.enviados;
      expect(envio).toMatchObject({ usuarioId: id, email: PEDIDO.email, nome: PEDIDO.nome });
      expect(envio!.expiraEm.getTime()).toBe(antes + VALIDADE_MAXIMA_DO_CONVITE_EM_HORAS * MILISSEGUNDOS_POR_HORA);
    });

    it('só o SHA-256 do texto do token vai ao banco; o token em claro não aparece em lugar nenhum', async () => {
      await semearCasa();

      const id = await convidarEPegarOId();
      await vi.waitFor(() => expect(enviador.enviados).toHaveLength(1));

      const { token } = enviador.enviados[0]!;
      const convites = await convitesDoUsuario(banco, INSTITUICAO_A, id);
      expect(convites.map(({ hash }) => hash)).toEqual([sha256Hex(token)]);
      const gravado = await tudoQueFoiGravadoEmTexto(banco, INSTITUICAO_A);
      expect(gravado).toContain(sha256Hex(token));
      expect(gravado).not.toContain(token);
    });

    it('falha no envio não desfaz o convite e a resposta continua 201', async () => {
      await semearCasa();
      enviador.falharCom = new Error('provedor de e-mail fora do ar');

      const resposta = await convidar();

      expect(resposta.status).toBe(201);
      expect(await estadoDoUsuario(banco, INSTITUICAO_A, resposta.corpo.id as UsuarioId)).toMatchObject({
        situacao: 'CONVITE_PENDENTE',
      });
    });
  });

  describe('idempotência', () => {
    it('replay com a mesma chave e o mesmo corpo não cria outro usuário nem reenvia e volta sem corpo', async () => {
      await semearCasa();
      const chave = randomUUID();
      const primeira = await aplicacao.pedirComo(ADMIN, ROTA_USUARIOS, {
        metodo: 'POST',
        corpo: PEDIDO,
        cabecalhos: { 'idempotency-key': chave },
      });
      const efeitos = await efeitosGravados(banco, INSTITUICAO_A);

      const replay = await aplicacao.pedirComo(ADMIN, ROTA_USUARIOS, {
        metodo: 'POST',
        corpo: PEDIDO,
        cabecalhos: { 'idempotency-key': chave },
      });

      expect(primeira.status).toBe(201);
      expect(replay.status).toBe(201);
      expect(replay.headers.get('location')).toBe(primeira.headers.get('location'));
      expect(await replay.text()).toBe('');
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitos);
      expect(enviador.enviados).toHaveLength(1);
    });

    it('a mesma chave com corpo diferente dá 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA e nada novo é gravado', async () => {
      await semearCasa();
      const chave = randomUUID();
      await convidar(PEDIDO, chave);
      const efeitos = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar({ ...PEDIDO, email: 'outra@casa.org' }, chave);

      expect(resposta.status).toBe(422);
      expect(resposta.corpo).toMatchObject({ erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitos);
      expect(enviador.enviados).toHaveLength(1);
    });
  });

  describe('e-mail duplicado', () => {
    it('dá 409 EMAIL_JA_CADASTRADO, mesmo com caixa diferente, sem trilha, outbox nem envio novos', async () => {
      await semearCasa();
      await convidar();
      const efeitos = await efeitosGravados(banco, INSTITUICAO_A);

      const resposta = await convidar({ nome: 'Outra Maria', email: 'MARIA@casa.org' });

      expect(resposta.status).toBe(409);
      expect(resposta.corpo).toMatchObject({ erro: 'EMAIL_JA_CADASTRADO' });
      expect(await efeitosGravados(banco, INSTITUICAO_A)).toEqual(efeitos);
      expect(enviador.enviados).toHaveLength(1);
    });

    it('dois convites concorrentes com o mesmo e-mail: um 201 e um 409, nunca 500', async () => {
      await semearCasa();

      const respostas = await Promise.all([convidar(PEDIDO, randomUUID()), convidar(PEDIDO, randomUUID())]);

      expect(respostas.map(({ status }) => status).toSorted()).toEqual([201, 409]);
      expect(respostas.find(({ status }) => status === 409)!.corpo).toMatchObject({ erro: 'EMAIL_JA_CADASTRADO' });
      const idDoConvidado = respostas.find(({ status }) => status === 201)!.corpo.id as UsuarioId;
      expect(await trilhaDoUsuario(banco, INSTITUICAO_A, idDoConvidado, 'USUARIO_CONVIDADO')).toHaveLength(1);
      expect(enviador.enviados).toHaveLength(1);
    });

    it('o mesmo e-mail em outra instituição é permitido', async () => {
      await semearCasa();
      await semearGruposDeSistema(aplicacao, INSTITUICAO_B);
      await semearCasaDeB();

      const resposta = await escrever(aplicacao, ADMIN_DE_B, ROTA_USUARIOS, { corpo: PEDIDO });
      const outra = await convidar();

      expect(resposta.status).toBe(201);
      expect(outra.status).toBe(201);
    });
  });
});
