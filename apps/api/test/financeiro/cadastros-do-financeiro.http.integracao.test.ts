import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import {
  contarCadastros,
  GERENTE,
  GERENTE_DE_B,
  idDoCadastro,
  LEITOR,
  linhaDoCadastro,
  pedirAoFinanceiro,
  ROTA_CATEGORIAS,
  ROTA_GRUPOS_DE_CUSTO,
  ROTA_UNIDADES,
  SEM_GRUPO,
  subirAplicacaoDoFinanceiro,
} from './apoio-http.js';

const CHAVE_DE_IDEMPOTENCIA = '0198a3c0-0000-7000-8000-00000000c1a1';
const UUID_INEXISTENTE = '0198a3c0-0000-7000-8000-0000000000ee';

const novaUnidade = (sobrescritas = {}) => ({ codigoSistema: 'OFICINA', nome: 'Oficina', regime: 'CONTRIBUICAO', ...sobrescritas });
const novoGrupoDeCusto = (sobrescritas = {}) => ({ codigoSistema: 'OFICINA', nome: 'Oficina', ...sobrescritas });
const novaCategoria = (sobrescritas = {}) => ({
  codigoSistema: 'ALUGUEL',
  nome: 'Aluguel de espaço',
  natureza: 'RECEITA',
  tipo: 'OPERACIONAL',
  regimesPermitidos: ['CONTRIBUICAO'],
  linhaRelatorio: 'Receita de aluguel',
  ...sobrescritas,
});

describe('cadastros do financeiro pela API (Doc 7 §12, §18.1)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    aplicacao = await subirAplicacaoDoFinanceiro(banco);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  const emA = (sujeito: string, caminho: string, pedido = {}) => pedirAoFinanceiro(aplicacao, sujeito, caminho, pedido);
  const unidadeDeA = (codigo: string) => idDoCadastro(banco, INSTITUICAO_A, 'unidade', codigo);
  const categoriaDeA = (codigo: string) => idDoCadastro(banco, INSTITUICAO_A, 'categoria', codigo);
  const grupoDeA = (codigo: string) => idDoCadastro(banco, INSTITUICAO_A, 'grupo_de_custo', codigo);

  describe('acesso', () => {
    it('sem token — cada rota — responde 401 NAO_AUTENTICADO', async () => {
      const respostas = await Promise.all(
        [ROTA_UNIDADES, ROTA_GRUPOS_DE_CUSTO, ROTA_CATEGORIAS].map((rota) => fetch(`${aplicacao.origem}${rota}`)),
      );

      expect(respostas.map(({ status }) => status)).toEqual([401, 401, 401]);
      expect(await Promise.all(respostas.map(async (resposta) => ((await resposta.json()) as { erro: string }).erro))).toEqual([
        'NAO_AUTENTICADO',
        'NAO_AUTENTICADO',
        'NAO_AUTENTICADO',
      ]);
    });

    it('usuário sem grupo — leitura de cada lista — responde 403 SEM_PERMISSAO', async () => {
      const respostas = await Promise.all([ROTA_UNIDADES, ROTA_GRUPOS_DE_CUSTO, ROTA_CATEGORIAS].map((rota) => emA(SEM_GRUPO, rota)));

      expect(respostas.map(({ status, corpo }) => [status, corpo['erro']])).toEqual([
        [403, 'SEM_PERMISSAO'],
        [403, 'SEM_PERMISSAO'],
        [403, 'SEM_PERMISSAO'],
      ]);
    });

    it('quem só lê — criar e editar — responde 403 SEM_PERMISSAO e não grava', async () => {
      const [cdd, cozinha, hospedagem] = await Promise.all([unidadeDeA('CDD'), grupoDeA('COZINHA'), categoriaDeA('HOSPEDAGEM')]);

      const respostas = await Promise.all([
        emA(LEITOR, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade() }),
        emA(LEITOR, ROTA_GRUPOS_DE_CUSTO, { metodo: 'POST', corpo: novoGrupoDeCusto() }),
        emA(LEITOR, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria() }),
        emA(LEITOR, `${ROTA_UNIDADES}/${cdd}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Outro', regime: 'CONTRIBUICAO', ativa: true } }),
        emA(LEITOR, `${ROTA_GRUPOS_DE_CUSTO}/${cozinha}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Outro', ativo: true } }),
        emA(LEITOR, `${ROTA_CATEGORIAS}/${hospedagem}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { nome: 'Outro', regimesPermitidos: ['CONTRIBUICAO'], unidadePadraoId: null, linhaRelatorio: 'Outra', ativa: true },
        }),
      ]);

      expect(respostas.map(({ status, corpo }) => [status, corpo['erro']])).toEqual(Array(6).fill([403, 'SEM_PERMISSAO']));
      expect(
        await Promise.all(
          (['unidade', 'grupo_de_custo', 'categoria'] as const).map((tabela) => contarCadastros(banco, INSTITUICAO_A, tabela)),
        ),
      ).toEqual([6, 6, 14]);
      expect((await emA(LEITOR, ROTA_CATEGORIAS)).corpo['itens']).toContainEqual(
        expect.objectContaining({ codigoSistema: 'HOSPEDAGEM', nome: 'Hospedagem', versao: 1 }),
      );
    });
  });

  describe('leitura', () => {
    it('instituição semeada — listas — trazem 6 unidades, 6 grupos de custo e 14 categorias com versão', async () => {
      const [unidades, grupos, categorias] = await Promise.all([
        emA(LEITOR, ROTA_UNIDADES),
        emA(LEITOR, ROTA_GRUPOS_DE_CUSTO),
        emA(LEITOR, ROTA_CATEGORIAS),
      ]);

      expect([unidades.status, grupos.status, categorias.status]).toEqual([200, 200, 200]);
      const itens = (resposta: { corpo: Record<string, unknown> }) => resposta.corpo['itens'] as Array<Record<string, unknown>>;
      expect([itens(unidades).length, itens(grupos).length, itens(categorias).length]).toEqual([6, 6, 14]);
      expect(itens(unidades).find(({ codigoSistema }) => codigoSistema === 'MUNAY')).toEqual({
        id: await unidadeDeA('MUNAY'),
        codigoSistema: 'MUNAY',
        nome: 'Munay',
        regime: 'COMERCIAL',
        tetoAnual: 8_100_000,
        ativa: true,
        versao: 1,
      });
      expect(itens(grupos).find(({ codigoSistema }) => codigoSistema === 'COZINHA')).toEqual({
        id: await grupoDeA('COZINHA'),
        codigoSistema: 'COZINHA',
        nome: 'Cozinha',
        ativo: true,
        versao: 1,
      });
      expect(itens(categorias).find(({ codigoSistema }) => codigoSistema === 'HOSPEDAGEM')).toEqual({
        id: await categoriaDeA('HOSPEDAGEM'),
        codigoSistema: 'HOSPEDAGEM',
        nome: 'Hospedagem',
        natureza: 'RECEITA',
        tipo: 'OPERACIONAL',
        regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
        unidadePadraoId: null,
        linhaRelatorio: 'Receita de hospedagem',
        ativa: true,
        versao: 1,
      });
    });

    it('cadastro inativado — lista — continua aparecendo com ativa falsa', async () => {
      const chacara = await unidadeDeA('CHACARA');
      await emA(GERENTE, `${ROTA_UNIDADES}/${chacara}`, {
        metodo: 'PUT',
        versao: 1,
        corpo: { nome: 'Chácara', regime: 'CONTRIBUICAO', ativa: false },
      });

      const { corpo } = await emA(LEITOR, ROTA_UNIDADES);

      expect((corpo['itens'] as Array<Record<string, unknown>>).find(({ id }) => id === chacara)).toMatchObject({ ativa: false, versao: 2 });
    });

    it('instituição B — listas — não trazem nada da instituição A', async () => {
      const { corpo } = await emA(GERENTE_DE_B, ROTA_UNIDADES);

      const idsDeB = (corpo['itens'] as Array<{ id: string }>).map(({ id }) => id);
      expect(idsDeB).toHaveLength(6);
      expect(idsDeB).not.toContain(await unidadeDeA('CDD'));
    });
  });

  describe('criar', () => {
    it('unidade — comando válido — responde 201 com Location e grava com versão 1', async () => {
      const resposta = await emA(GERENTE, ROTA_UNIDADES, {
        metodo: 'POST',
        corpo: novaUnidade({ regime: 'COMERCIAL', tetoAnual: 5_000_000 }),
      });

      expect(resposta.status).toBe(201);
      expect(resposta.corpo).toEqual({
        id: expect.any(String),
        codigoSistema: 'OFICINA',
        nome: 'Oficina',
        regime: 'COMERCIAL',
        tetoAnual: 5_000_000,
        ativa: true,
        versao: 1,
      });
      expect(resposta.localizacao).toBe(`${ROTA_UNIDADES}/${resposta.corpo['id'] as string}`);
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'unidade', resposta.corpo['id'] as string)).toMatchObject({
        codigo_sistema: 'OFICINA',
        versao: 1,
      });
    });

    it('grupo de custo — comando válido — responde 201 com Location', async () => {
      const resposta = await emA(GERENTE, ROTA_GRUPOS_DE_CUSTO, { metodo: 'POST', corpo: novoGrupoDeCusto() });

      expect(resposta.status).toBe(201);
      expect(resposta.corpo).toEqual({ id: expect.any(String), codigoSistema: 'OFICINA', nome: 'Oficina', ativo: true, versao: 1 });
      expect(resposta.localizacao).toBe(`${ROTA_GRUPOS_DE_CUSTO}/${resposta.corpo['id'] as string}`);
    });

    it('categoria — com unidade padrão compatível com o regime — responde 201 com Location', async () => {
      const cdd = await unidadeDeA('CDD');

      const resposta = await emA(GERENTE, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria({ unidadePadraoId: cdd }) });

      expect(resposta.status).toBe(201);
      expect(resposta.corpo).toMatchObject({ codigoSistema: 'ALUGUEL', unidadePadraoId: cdd, tipo: 'OPERACIONAL', versao: 1 });
      expect(resposta.localizacao).toBe(`${ROTA_CATEGORIAS}/${resposta.corpo['id'] as string}`);
    });

    it('mesma Idempotency-Key repetida — criação — repete a resposta e grava uma vez', async () => {
      const pedido = { metodo: 'POST', corpo: novaUnidade(), chave: CHAVE_DE_IDEMPOTENCIA } as const;

      const primeira = await emA(GERENTE, ROTA_UNIDADES, pedido);
      const segunda = await emA(GERENTE, ROTA_UNIDADES, pedido);

      expect(primeira.status).toBe(201);
      expect(segunda).toEqual(primeira);
      expect(await contarCadastros(banco, INSTITUICAO_A, 'unidade')).toBe(7);
    });

    it('mesma Idempotency-Key com outro corpo — criação — responde 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA', async () => {
      await emA(GERENTE, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade(), chave: CHAVE_DE_IDEMPOTENCIA });

      const resposta = await emA(GERENTE, ROTA_UNIDADES, {
        metodo: 'POST',
        corpo: novaUnidade({ codigoSistema: 'OUTRA' }),
        chave: CHAVE_DE_IDEMPOTENCIA,
      });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([422, 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA']);
    });

    it('código de sistema já existente — cada cadastro — responde 409 CODIGO_DE_SISTEMA_JA_EXISTE', async () => {
      const respostas = [
        await emA(GERENTE, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade({ codigoSistema: 'CDD' }) }),
        await emA(GERENTE, ROTA_GRUPOS_DE_CUSTO, { metodo: 'POST', corpo: novoGrupoDeCusto({ codigoSistema: 'COZINHA' }) }),
        await emA(GERENTE, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria({ codigoSistema: 'MANUTENCAO' }) }),
      ];

      expect(respostas.map(({ status, corpo }) => [status, corpo['erro']])).toEqual(Array(3).fill([409, 'CODIGO_DE_SISTEMA_JA_EXISTE']));
      expect(await contarCadastros(banco, INSTITUICAO_A, 'categoria')).toBe(14);
    });

    it('mesmo código de sistema em outra instituição — criação — é aceito', async () => {
      await emA(GERENTE, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade() });

      const resposta = await pedirAoFinanceiro(aplicacao, GERENTE_DE_B, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade() });

      expect(resposta.status).toBe(201);
    });

    it('teto anual em unidade de contribuição — criação — responde 400 CORPO_INVALIDO', async () => {
      const resposta = await emA(GERENTE, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade({ tetoAnual: 100 }) });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([400, 'CORPO_INVALIDO']);
    });

    it('categoria com unidade padrão de regime não permitido — criação — responde 422 CATEGORIA_FORA_DO_REGIME e não grava', async () => {
      const munay = await unidadeDeA('MUNAY');

      const resposta = await emA(GERENTE, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria({ unidadePadraoId: munay }) });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([422, 'CATEGORIA_FORA_DO_REGIME']);
      expect(await contarCadastros(banco, INSTITUICAO_A, 'categoria')).toBe(14);
    });

    it('categoria com unidade padrão inexistente — criação — responde 404 RECURSO_NAO_ENCONTRADO', async () => {
      const resposta = await emA(GERENTE, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria({ unidadePadraoId: UUID_INEXISTENTE }) });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([404, 'RECURSO_NAO_ENCONTRADO']);
    });

    it('categoria com unidade padrão de outra instituição — criação — responde 404 RECURSO_NAO_ENCONTRADO', async () => {
      const cddDeB = await idDoCadastro(banco, INSTITUICAO_B, 'unidade', 'CDD');

      const resposta = await emA(GERENTE, ROTA_CATEGORIAS, { metodo: 'POST', corpo: novaCategoria({ unidadePadraoId: cddDeB }) });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([404, 'RECURSO_NAO_ENCONTRADO']);
    });
  });

  describe('editar', () => {
    const edicaoDaUnidade = { nome: 'Munay Música', regime: 'COMERCIAL', tetoAnual: 9_000_000, ativa: true };

    it('unidade — versão certa em If-Match — responde 200 com o recurso e a versão nova', async () => {
      const munay = await unidadeDeA('MUNAY');

      const resposta = await emA(GERENTE, `${ROTA_UNIDADES}/${munay}`, { metodo: 'PUT', versao: 1, corpo: edicaoDaUnidade });

      expect(resposta.status).toBe(200);
      expect(resposta.corpo).toEqual({ id: munay, codigoSistema: 'MUNAY', ...edicaoDaUnidade, versao: 2 });
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'unidade', munay)).toMatchObject({ nome: 'Munay Música', versao: 2 });
    });

    it('unidade — versão errada em If-Match — responde 409 VERSAO_DESATUALIZADA e não altera', async () => {
      const munay = await unidadeDeA('MUNAY');

      const resposta = await emA(GERENTE, `${ROTA_UNIDADES}/${munay}`, { metodo: 'PUT', versao: 7, corpo: edicaoDaUnidade });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([409, 'VERSAO_DESATUALIZADA']);
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'unidade', munay)).toMatchObject({ nome: 'Munay', versao: 1 });
    });

    it('unidade — sem If-Match — responde 428 VERSAO_OBRIGATORIA', async () => {
      const munay = await unidadeDeA('MUNAY');

      const resposta = await emA(GERENTE, `${ROTA_UNIDADES}/${munay}`, { metodo: 'PUT', corpo: edicaoDaUnidade });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([428, 'VERSAO_OBRIGATORIA']);
    });

    it('unidade — mudar para contribuição mantendo teto — responde 400 CORPO_INVALIDO', async () => {
      const munay = await unidadeDeA('MUNAY');

      const resposta = await emA(GERENTE, `${ROTA_UNIDADES}/${munay}`, {
        metodo: 'PUT',
        versao: 1,
        corpo: { ...edicaoDaUnidade, regime: 'CONTRIBUICAO' },
      });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([400, 'CORPO_INVALIDO']);
    });

    it('grupo de custo — versão certa — renomeia e inativa subindo a versão', async () => {
      const cozinha = await grupoDeA('COZINHA');

      const resposta = await emA(GERENTE, `${ROTA_GRUPOS_DE_CUSTO}/${cozinha}`, {
        metodo: 'PUT',
        versao: 1,
        corpo: { nome: 'Cozinha central', ativo: false },
      });

      expect(resposta.status).toBe(200);
      expect(resposta.corpo).toEqual({ id: cozinha, codigoSistema: 'COZINHA', nome: 'Cozinha central', ativo: false, versao: 2 });
    });

    it('grupo de custo — versão errada e ausente — responde 409 e 428', async () => {
      const cozinha = await grupoDeA('COZINHA');
      const corpo = { nome: 'Cozinha central', ativo: true };

      const errada = await emA(GERENTE, `${ROTA_GRUPOS_DE_CUSTO}/${cozinha}`, { metodo: 'PUT', versao: 9, corpo });
      const ausente = await emA(GERENTE, `${ROTA_GRUPOS_DE_CUSTO}/${cozinha}`, { metodo: 'PUT', corpo });

      expect([errada.status, errada.corpo['erro'], ausente.status, ausente.corpo['erro']]).toEqual([
        409,
        'VERSAO_DESATUALIZADA',
        428,
        'VERSAO_OBRIGATORIA',
      ]);
    });

    describe('categoria', () => {
      const edicaoDaCategoria = {
        nome: 'Hospedagem e estadia',
        regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
        unidadePadraoId: null,
        linhaRelatorio: 'Receita de hospedagem',
        ativa: true,
      };

      it('versão certa — responde 200 com o recurso e a versão nova', async () => {
        const hospedagem = await categoriaDeA('HOSPEDAGEM');
        const lojinha = await unidadeDeA('LOJINHA');

        const resposta = await emA(GERENTE, `${ROTA_CATEGORIAS}/${hospedagem}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { ...edicaoDaCategoria, unidadePadraoId: lojinha },
        });

        expect(resposta.status).toBe(200);
        expect(resposta.corpo).toMatchObject({
          id: hospedagem,
          codigoSistema: 'HOSPEDAGEM',
          nome: 'Hospedagem e estadia',
          unidadePadraoId: lojinha,
          versao: 2,
        });
      });

      it('versão errada e ausente — responde 409 e 428', async () => {
        const hospedagem = await categoriaDeA('HOSPEDAGEM');

        const errada = await emA(GERENTE, `${ROTA_CATEGORIAS}/${hospedagem}`, { metodo: 'PUT', versao: 3, corpo: edicaoDaCategoria });
        const ausente = await emA(GERENTE, `${ROTA_CATEGORIAS}/${hospedagem}`, { metodo: 'PUT', corpo: edicaoDaCategoria });

        expect([errada.status, errada.corpo['erro'], ausente.status, ausente.corpo['erro']]).toEqual([
          409,
          'VERSAO_DESATUALIZADA',
          428,
          'VERSAO_OBRIGATORIA',
        ]);
      });

      it('unidade padrão de regime não permitido — responde 422 CATEGORIA_FORA_DO_REGIME e não altera', async () => {
        const hospedagem = await categoriaDeA('HOSPEDAGEM');
        const cdd = await unidadeDeA('CDD');

        const resposta = await emA(GERENTE, `${ROTA_CATEGORIAS}/${hospedagem}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { ...edicaoDaCategoria, regimesPermitidos: ['COMERCIAL'], unidadePadraoId: cdd },
        });

        expect([resposta.status, resposta.corpo['erro']]).toEqual([422, 'CATEGORIA_FORA_DO_REGIME']);
        expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'categoria', hospedagem)).toMatchObject({ versao: 1, nome: 'Hospedagem' });
      });

      it('unidade padrão inexistente — responde 404 RECURSO_NAO_ENCONTRADO', async () => {
        const hospedagem = await categoriaDeA('HOSPEDAGEM');

        const resposta = await emA(GERENTE, `${ROTA_CATEGORIAS}/${hospedagem}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { ...edicaoDaCategoria, unidadePadraoId: UUID_INEXISTENTE },
        });

        expect([resposta.status, resposta.corpo['erro']]).toEqual([404, 'RECURSO_NAO_ENCONTRADO']);
      });

      it('campo tipo no corpo — edição — é ignorado e o tipo gravado não muda', async () => {
        const obra = await categoriaDeA('OBRA_DORMITORIO');

        const resposta = await emA(GERENTE, `${ROTA_CATEGORIAS}/${obra}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { ...edicaoDaCategoria, tipo: 'OPERACIONAL', natureza: 'RECEITA' },
        });

        expect(resposta.status).toBe(200);
        expect(resposta.corpo).toMatchObject({ tipo: 'INVESTIMENTO', natureza: 'DESPESA', versao: 2 });
        expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'categoria', obra)).toMatchObject({ tipo: 'INVESTIMENTO', natureza: 'DESPESA' });
      });
    });

    it('id inexistente — cada cadastro — responde 404 RECURSO_NAO_ENCONTRADO', async () => {
      const respostas = [
        await emA(GERENTE, `${ROTA_UNIDADES}/${UUID_INEXISTENTE}`, { metodo: 'PUT', versao: 1, corpo: edicaoDaUnidade }),
        await emA(GERENTE, `${ROTA_GRUPOS_DE_CUSTO}/${UUID_INEXISTENTE}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'X', ativo: true } }),
      ];

      expect(respostas.map(({ status, corpo }) => [status, corpo['erro']])).toEqual(Array(2).fill([404, 'RECURSO_NAO_ENCONTRADO']));
    });

    it('id que não é UUID — edição — responde 400 CORPO_INVALIDO', async () => {
      const resposta = await emA(GERENTE, `${ROTA_UNIDADES}/nao-e-uuid`, { metodo: 'PUT', versao: 1, corpo: edicaoDaUnidade });

      expect([resposta.status, resposta.corpo['erro']]).toEqual([400, 'CORPO_INVALIDO']);
    });
  });

  describe('isolamento entre instituições', () => {
    it('cadastro da casa A — editado por quem é da casa B — responde 404 e não altera', async () => {
      const cdd = await unidadeDeA('CDD');
      const cozinha = await grupoDeA('COZINHA');
      const hospedagem = await categoriaDeA('HOSPEDAGEM');

      const respostas = [
        await pedirAoFinanceiro(aplicacao, GERENTE_DE_B, `${ROTA_UNIDADES}/${cdd}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { nome: 'Invasão', regime: 'CONTRIBUICAO', ativa: false },
        }),
        await pedirAoFinanceiro(aplicacao, GERENTE_DE_B, `${ROTA_GRUPOS_DE_CUSTO}/${cozinha}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { nome: 'Invasão', ativo: false },
        }),
        await pedirAoFinanceiro(aplicacao, GERENTE_DE_B, `${ROTA_CATEGORIAS}/${hospedagem}`, {
          metodo: 'PUT',
          versao: 1,
          corpo: { nome: 'Invasão', regimesPermitidos: ['COMERCIAL'], unidadePadraoId: null, linhaRelatorio: 'X', ativa: false },
        }),
      ];

      expect(respostas.map(({ status, corpo }) => [status, corpo['erro']])).toEqual(Array(3).fill([404, 'RECURSO_NAO_ENCONTRADO']));
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'unidade', cdd)).toMatchObject({ nome: 'CDD', ativa: true, versao: 1 });
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'grupo_de_custo', cozinha)).toMatchObject({ nome: 'Cozinha', versao: 1 });
      expect(await linhaDoCadastro(banco, INSTITUICAO_A, 'categoria', hospedagem)).toMatchObject({ nome: 'Hospedagem', versao: 1 });
    });

    it('criação na casa B — não aparece na lista da casa A', async () => {
      await pedirAoFinanceiro(aplicacao, GERENTE_DE_B, ROTA_UNIDADES, { metodo: 'POST', corpo: novaUnidade({ codigoSistema: 'SO_DE_B' }) });

      const { corpo } = await emA(LEITOR, ROTA_UNIDADES);

      expect((corpo['itens'] as Array<{ codigoSistema: string }>).map(({ codigoSistema }) => codigoSistema)).not.toContain('SO_DE_B');
      expect(await contarCadastros(banco, INSTITUICAO_A, 'unidade')).toBe(6);
      expect(await contarCadastros(banco, INSTITUICAO_B, 'unidade')).toBe(7);
    });
  });
});
