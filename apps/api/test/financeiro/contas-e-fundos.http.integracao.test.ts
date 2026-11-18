import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { GERENTE, GERENTE_DE_B, LEITOR, SEM_GRUPO, ROTA_CATEGORIAS, ROTA_UNIDADES, idDoCadastro, pedirAoFinanceiro, subirAplicacaoDoFinanceiro } from './apoio-http.js';

const CONTAS = '/api/v1/financeiro/contas';
const FUNDOS = '/api/v1/financeiro/fundos';
const LEITOR_CONTAS = 'sub-leitor-contas';
const GERENTE_CONTAS = 'sub-gerente-contas';
const GERENTE_FUNDOS = 'sub-gerente-fundos';
const GERENTE_B = 'sub-gerente-contas-b';
const INEXISTENTE = '0198a3c0-0000-7000-8000-0000000000ee';
const CHAVE = '0198a3c0-0000-7000-8000-00000000c1a2';
const conta = (sobrescritas = {}) => ({ nome: 'Cora CDD', tipo: 'CONTA_CORRENTE', titularidade: 'INSTITUCIONAL', ...sobrescritas });
const fundo = (contaVinculadaId: string, sobrescritas = {}) => ({
  codigoSistema: 'DAIME', nome: 'Caixinha Ayahuasca', contaVinculadaId, categoriasPermitidas: ['MANUTENCAO'], ...sobrescritas,
});

describe('contas e fundos pela API', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  const pedir = (sujeito: string, rota: string, pedido = {}) => pedirAoFinanceiro(aplicacao, sujeito, rota, pedido);
  const criarConta = async (sobrescritas = {}, sujeito = GERENTE_CONTAS) => {
    const resposta = await pedir(sujeito, CONTAS, { metodo: 'POST', corpo: conta(sobrescritas) });
    expect(resposta.status).toBe(201);
    return resposta.corpo['id'] as string;
  };
  const criarFundo = async (contaId: string) => {
    const resposta = await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(contaId) });
    expect(resposta.status).toBe(201);
    return resposta.corpo['id'] as string;
  };

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    aplicacao = await subirAplicacaoDoFinanceiro(banco);
    const leitura = novoGrupoNomeado('Leitura de contas', ['financeiro.conta.ler']);
    const contas = novoGrupoNomeado('Gerência de contas', ['financeiro.conta.gerenciar']);
    const fundos = novoGrupoNomeado('Gerência de fundos', ['financeiro.fundo.gerenciar']);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [leitura, contas, fundos], [
      usuarioAtivoEm(LEITOR_CONTAS, [leitura]), usuarioAtivoEm(GERENTE_CONTAS, [contas]), usuarioAtivoEm(GERENTE_FUNDOS, [fundos]),
    ]);
    const b = novoGrupoNomeado('Contas de B', ['financeiro.conta.ler', 'financeiro.conta.gerenciar', 'financeiro.fundo.gerenciar']);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [b], [usuarioAtivoEm(GERENTE_B, [b])]);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  it('exige autenticação e permissão de leitura em ambas as listas', async () => {
    await Promise.all(([CONTAS, FUNDOS]).map(async (rota) => {
      expect((await fetch(`${aplicacao.origem}${rota}`)).status).toBe(401);
      await Promise.all(([SEM_GRUPO, LEITOR]).map(async (sujeito) => {
        const resposta = await pedir(sujeito, rota);
        expect([resposta.status, resposta.corpo['erro']]).toEqual([403, 'SEM_PERMISSAO']);
      }));
      expect((await pedir(LEITOR_CONTAS, rota)).corpo).toEqual({ itens: [] });
    }));
  });

  it('separa as permissões de gerenciar contas e fundos, inclusive na edição', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    await Promise.all(([LEITOR_CONTAS, GERENTE_FUNDOS]).map(async (sujeito) => {
      expect((await pedir(sujeito, CONTAS, { metodo: 'POST', corpo: conta() })).status).toBe(403);
      expect((await pedir(sujeito, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Outro', ativa: false } })).status).toBe(403);
    }));
    await Promise.all(([LEITOR_CONTAS, GERENTE_CONTAS]).map(async (sujeito) => {
      expect((await pedir(sujeito, FUNDOS, { metodo: 'POST', corpo: fundo(id) })).status).toBe(403);
      expect((await pedir(sujeito, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(id), ativo: false } })).status).toBe(403);
    }));
  });

  it('cria conta canônica e fundo sem saldo, com Location, defaults e meta em centavos', async () => {
    const criada = await pedir(GERENTE_CONTAS, CONTAS, { metodo: 'POST', corpo: conta({ identificadorBancario: ' itau- 1\u200B ' }) });
    const id = criada.corpo['id'] as string;
    expect(criada.status).toBe(201);
    expect(criada.localizacao).toBe(`${CONTAS}/${id}`);
    expect(criada.corpo).toEqual({ id, nome: 'Cora CDD', tipo: 'CONTA_CORRENTE', titularidade: 'INSTITUCIONAL',
      pessoaTitularId: null, identificadorBancario: 'ITAU-1', unidadeId: null, descricao: '', ativa: true, versao: 1 });
    const criado = await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(id, { meta: 123456 }) });
    expect(criado.status).toBe(201);
    expect(criado.localizacao).toBe(`${FUNDOS}/${criado.corpo['id'] as string}`);
    expect(criado.corpo).toEqual({ id: expect.any(String), ...fundo(id), meta: 123456, nota: '', ativo: true, versao: 1 });
    expect((await pedir(LEITOR_CONTAS, CONTAS)).corpo['itens']).toEqual([criada.corpo]);
    expect((await pedir(LEITOR_CONTAS, FUNDOS)).corpo['itens']).toEqual([criado.corpo]);
  });

  it('recusa identificador bancário duplicado, inclusive na edição, e permite em outra casa', async () => {
    await criarConta({ identificadorBancario: 'ITAU-1' });
    const duplicada = await pedir(GERENTE_CONTAS, CONTAS, { metodo: 'POST', corpo: conta({ identificadorBancario: 'itau -1' }) });
    expect([duplicada.status, duplicada.corpo['erro']]).toEqual([409, 'IDENTIFICADOR_BANCARIO_JA_CADASTRADO']);
    const id = await criarConta();
    const editada = await pedir(GERENTE_CONTAS, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Duplicada', ativa: true, identificadorBancario: 'ITAU-1' } });
    expect([editada.status, editada.corpo['erro']]).toEqual([409, 'IDENTIFICADOR_BANCARIO_JA_CADASTRADO']);
    expect((await pedir(LEITOR_CONTAS, CONTAS)).corpo['itens']).toContainEqual(expect.objectContaining({ id, nome: 'Cora CDD', versao: 1 }));
    await criarConta({ identificadorBancario: 'ITAU-1' }, GERENTE_B);
  });

  it('recusa código de fundo duplicado na mesma casa', async () => {
    const id = await criarConta();
    await criarFundo(id);
    const resposta = await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(id) });
    expect([resposta.status, resposta.corpo['erro']]).toEqual([409, 'CODIGO_DE_SISTEMA_JA_EXISTE']);
  });

  it('edição preserva tipo, titularidade, titular e código do fundo, incrementa versão e mantém inativos nas listas', async () => {
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into pessoas.pessoa (id, instituicao_id, tipo, nome) values ($1, $2, 'FISICA', 'Titular de teste')", [INEXISTENTE, INSTITUICAO_A]);
    const id = await criarConta({ titularidade: 'PESSOAL_DE_TERCEIRO', pessoaTitularId: INEXISTENTE });
    const fid = await criarFundo(id);
    const editada = await pedir(GERENTE_CONTAS, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: {
      nome: 'Conta pessoal', ativa: false, tipo: 'DINHEIRO', titularidade: 'INSTITUCIONAL', pessoaTitularId: null,
    } });
    expect(editada.status).toBe(200);
    expect(editada.corpo).toMatchObject({ tipo: 'CONTA_CORRENTE', titularidade: 'PESSOAL_DE_TERCEIRO', pessoaTitularId: INEXISTENTE, versao: 2, ativa: false });
    const editado = await pedir(GERENTE_FUNDOS, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(id), codigoSistema: 'OUTRO', ativo: false } });
    expect(editado.status).toBe(200);
    expect(editado.corpo).toMatchObject({ codigoSistema: 'DAIME', versao: 2, ativo: false });
    expect((await pedir(LEITOR_CONTAS, CONTAS)).corpo['itens']).toEqual([editada.corpo]);
    expect((await pedir(LEITOR_CONTAS, FUNDOS)).corpo['itens']).toEqual([editado.corpo]);
  });

  it('requer If-Match, recusa versões antigas e recursos desconhecidos nos dois cadastros', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    await Promise.all(([
      [CONTAS, id, GERENTE_CONTAS, { nome: 'Outro', ativa: true }],
      [FUNDOS, fid, GERENTE_FUNDOS, { ...fundo(id), ativo: true }],
    ] as const).map(async ([rota, alvo, sujeito, corpo]) => {
      expect((await pedir(sujeito, `${rota}/${alvo}`, { metodo: 'PUT', corpo })).status).toBe(428);
      const velha = await pedir(sujeito, `${rota}/${alvo}`, { metodo: 'PUT', versao: 2, corpo });
      expect([velha.status, velha.corpo['erro']]).toEqual([409, 'VERSAO_DESATUALIZADA']);
      expect((await pedir(sujeito, `${rota}/${INEXISTENTE}`, { metodo: 'PUT', versao: 1, corpo })).status).toBe(404);
    }));
  });

  it('isola listas, edição e referências de conta entre instituições', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    await Promise.all([CONTAS, FUNDOS].map(async (rota) => {
      expect((await pedir(GERENTE_B, rota)).corpo).toEqual({ itens: [] });
    }));
    expect((await pedir(GERENTE_B, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Invadida', ativa: false } })).status).toBe(404);
    expect((await pedir(GERENTE_B, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(id), ativo: false } })).status).toBe(404);
    expect((await pedir(GERENTE_B, FUNDOS, { metodo: 'POST', corpo: fundo(id) })).status).toBe(404);
    const idB = await criarConta({}, GERENTE_B);
    expect((await pedir(GERENTE_FUNDOS, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(idB), ativo: true } })).status).toBe(404);
  });

  it('recusa unidade inexistente, de outra instituição ou inativa em vínculo novo da conta', async () => {
    const id = await criarConta();
    const unidadeB = await idDoCadastro(banco, INSTITUICAO_B, 'unidade', 'CDD');
    const unidadeA = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CDD');
    await pedir(GERENTE, `${ROTA_UNIDADES}/${unidadeA}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'CDD', regime: 'CONTRIBUICAO', ativa: false } });
    await Promise.all(([[INEXISTENTE, 404], [unidadeB, 404], [unidadeA, 422]] as const).map(async ([unidadeId, status]) => {
      expect((await pedir(GERENTE_CONTAS, CONTAS, { metodo: 'POST', corpo: conta({ unidadeId }) })).status).toBe(status);
      expect((await pedir(GERENTE_CONTAS, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Outro', ativa: true, unidadeId } })).status).toBe(status);
    }));
  });

  it('recusa conta inativa ou inexistente ao criar fundo e ao trocar a conta vinculada', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    const inativa = await criarConta({ nome: 'Inativa' });
    await pedir(GERENTE_CONTAS, `${CONTAS}/${inativa}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Inativa', ativa: false } });
    await Promise.all(([[inativa, 422], [INEXISTENTE, 404]] as const).map(async ([alvo, status]) => {
      expect((await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(alvo, { codigoSistema: 'NOVO' }) })).status).toBe(status);
      expect((await pedir(GERENTE_FUNDOS, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(alvo), ativo: true } })).status).toBe(status);
    }));
    expect((await pedir(LEITOR_CONTAS, FUNDOS)).corpo['itens']).toContainEqual(expect.objectContaining({ id: fid, contaVinculadaId: id, versao: 1 }));
    const nova = await criarConta({ nome: 'Nova' });
    const trocada = await pedir(GERENTE_FUNDOS, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(nova), ativo: true } });
    expect(trocada.status).toBe(200);
    expect(trocada.corpo).toMatchObject({ contaVinculadaId: nova, versao: 2 });
  });

  it('confere categorias por código na casa, tanto na criação quanto na edição', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    const categoriaB = await pedir(GERENTE_DE_B, ROTA_CATEGORIAS, { metodo: 'POST', corpo: {
      codigoSistema: 'SO_EM_B', nome: 'Só B', natureza: 'DESPESA', tipo: 'OPERACIONAL', regimesPermitidos: ['CONTRIBUICAO'], linhaRelatorio: 'Outras',
    } });
    expect(categoriaB.status).toBe(201);
    await Promise.all((['DESCONHECIDA', 'SO_EM_B']).map(async (codigo) => {
      expect((await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(id, { codigoSistema: 'NOVO', categoriasPermitidas: [codigo] }) })).status).toBe(404);
      expect((await pedir(GERENTE_FUNDOS, `${FUNDOS}/${fid}`, { metodo: 'PUT', versao: 1, corpo: { ...fundo(id), categoriasPermitidas: [codigo], ativo: true } })).status).toBe(404);
    }));
    expect((await pedir(LEITOR_CONTAS, FUNDOS)).corpo['itens']).toContainEqual(expect.objectContaining({ id: fid, categoriasPermitidas: ['MANUTENCAO'], versao: 1 }));
    expect((await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(id, { codigoSistema: 'VAZIO', categoriasPermitidas: [] }) })).status).toBe(201);
  });

  it('aplica validação Zod de titularidade, meta e categorias duplicadas', async () => {
    expect((await pedir(GERENTE_CONTAS, CONTAS, { metodo: 'POST', corpo: conta({ titularidade: 'PESSOAL_DE_TERCEIRO' }) })).status).toBe(400);
    const id = await criarConta();
    await Promise.all(([{ meta: 0 }, { meta: -1 }, { categoriasPermitidas: ['MANUTENCAO', 'MANUTENCAO'] }]).map(async (campos) => {
      expect((await pedir(GERENTE_FUNDOS, FUNDOS, { metodo: 'POST', corpo: fundo(id, campos) })).status).toBe(400);
    }));
  });

  it('permite manter unidade já vinculada depois da inativação', async () => {
    const unidadeId = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CDD');
    const id = await criarConta({ unidadeId });
    const inativada = await pedir(GERENTE, `${ROTA_UNIDADES}/${unidadeId}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'CDD', regime: 'CONTRIBUICAO', ativa: false } });
    expect(inativada.status).toBe(200);
    const resposta = await pedir(GERENTE_CONTAS, `${CONTAS}/${id}`, { metodo: 'PUT', versao: 1, corpo: { nome: 'Renomeada', unidadeId, ativa: false } });
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({ unidadeId, ativa: false, versao: 2 });
  });

  it('duas edições concorrentes da mesma versão gravam só uma vez em cada cadastro', async () => {
    const id = await criarConta();
    const fid = await criarFundo(id);
    await Promise.all(([
      [CONTAS, id, GERENTE_CONTAS, { nome: 'Atualizada', ativa: true }],
      [FUNDOS, fid, GERENTE_FUNDOS, { ...fundo(id), nome: 'Atualizado', ativo: true }],
    ] as const).map(async ([rota, alvo, sujeito, corpo]) => {
      const respostas = await Promise.all([1, 2].map(() => pedir(sujeito, `${rota}/${alvo}`, { metodo: 'PUT', versao: 1, corpo })));
      expect(respostas.map(({ status }) => status).toSorted()).toEqual([200, 409]);
      expect(respostas.find(({ status }) => status === 409)?.corpo['erro']).toBe('VERSAO_DESATUALIZADA');
      expect((await pedir(LEITOR_CONTAS, rota)).corpo['itens']).toContainEqual(expect.objectContaining({ id: alvo, versao: 2 }));
    }));
  });

  it('replay idempotente cria só uma conta e um fundo', async () => {
    const pedido = { metodo: 'POST', corpo: conta(), chave: CHAVE } as const;
    const primeira = await pedir(GERENTE_CONTAS, CONTAS, pedido);
    expect(primeira.status).toBe(201);
    expect(await pedir(GERENTE_CONTAS, CONTAS, pedido)).toEqual(primeira);
    const pedidoFundo = { metodo: 'POST', corpo: fundo(primeira.corpo['id'] as string), chave: '0198a3c0-0000-7000-8000-00000000c1a3' } as const;
    const primeiro = await pedir(GERENTE_FUNDOS, FUNDOS, pedidoFundo);
    expect(primeiro.status).toBe(201);
    expect(await pedir(GERENTE_FUNDOS, FUNDOS, pedidoFundo)).toEqual(primeiro);
    expect((await pedir(LEITOR_CONTAS, CONTAS)).corpo['itens']).toHaveLength(1);
    expect((await pedir(LEITOR_CONTAS, FUNDOS)).corpo['itens']).toHaveLength(1);
  });
});
