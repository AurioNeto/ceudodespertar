import { RepositorioDoOutbox } from '../../src/shared/infrastructure/eventos/repositorio-do-outbox.js';
import { gravarNaInstituicao } from './apoio.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { SEM_GRUPO, subirAplicacaoDoFinanceiro } from '../financeiro/apoio-http.js';
import type { PedidoAoFinanceiro } from '../financeiro/apoio-http.js';

const ROTA = '/api/v1/pessoas';
const LEITOR = 'sub-leitor-pessoas';
const CADASTRO = 'sub-cadastro-pessoas';
const EDICAO = 'sub-edicao-pessoas';
const GERENTE = 'sub-gerente-pessoas';
const OUTRA_CASA = 'sub-pessoas-b';
const UUID_AUSENTE = '0198a3c0-0000-7000-8000-0000000000ee';
const DOCUMENTO = '12345678901';
const CHAVE = '0198a3c0-0000-7000-8000-00000000c1b1';
const pessoa = (campos = {}) => ({ nome: 'Pessoa de teste', tipo: 'FISICA', documento: DOCUMENTO, ...campos });

describe('pessoa mínima pela API', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    aplicacao = await subirAplicacaoDoFinanceiro(banco);
    const leitura = novoGrupoNomeado('Ler pessoas', ['pessoas.pessoa.ler']);
    const cadastro = novoGrupoNomeado('Cadastrar pessoas', ['pessoas.pessoa.registrar']);
    const edicao = novoGrupoNomeado('Editar pessoas', ['pessoas.pessoa.editar']);
    const gerencia = novoGrupoNomeado('Gerir pessoas', ['pessoas.pessoa.ler', 'pessoas.pessoa.registrar', 'pessoas.pessoa.editar', 'financeiro.conta.gerenciar']);
    await semearUsuarios(aplicacao, INSTITUICAO_A, [leitura, cadastro, edicao, gerencia], [
      usuarioAtivoEm(LEITOR, [leitura]), usuarioAtivoEm(CADASTRO, [cadastro]), usuarioAtivoEm(EDICAO, [edicao]), usuarioAtivoEm(GERENTE, [gerencia]),
    ]);
    const outra = novoGrupoNomeado('Pessoas B', ['pessoas.pessoa.ler', 'pessoas.pessoa.registrar', 'pessoas.pessoa.editar']);
    await semearUsuarios(aplicacao, INSTITUICAO_B, [outra], [usuarioAtivoEm(OUTRA_CASA, [outra])]);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function pedir(sujeito: string, rota = ROTA, { metodo, corpo, versao, chave }: PedidoAoFinanceiro = {}) {
    const cabecalhos: Record<string, string> = {};
    if (versao !== undefined) cabecalhos['if-match'] = String(versao);
    if (chave !== undefined) cabecalhos['idempotency-key'] = chave;
    const resposta = await aplicacao.pedirComo(sujeito, rota, { metodo, corpo, cabecalhos });
    const texto = await resposta.text();
    return { status: resposta.status, corpo: (texto ? JSON.parse(texto) : {}) as Record<string, unknown>, texto,
      localizacao: resposta.headers.get('location'), cache: resposta.headers.get('cache-control') };
  }

  async function cadastrar(campos = {}, sujeito = GERENTE) {
    const resposta = await pedir(sujeito, ROTA, { metodo: 'POST', corpo: pessoa(campos) });
    expect(resposta.status).toBe(201);
    return resposta.corpo['id'] as string;
  }

  const quantidade = async () => {
    const linhas = await consultarNaInstituicao<{ total: number }>(banco, INSTITUICAO_A, 'select count(*)::int as total from pessoas.pessoa');
    return linhas[0]!.total;
  };

  it('exige autenticação e aplica separadamente ler, cadastrar e editar', async () => {
    expect((await fetch(`${aplicacao.origem}${ROTA}`)).status).toBe(401);
    const id = await cadastrar({}, CADASTRO);
    expect((await pedir(LEITOR)).status).toBe(200);
    expect((await pedir(LEITOR, `${ROTA}/${id}`)).status).toBe(200);
    expect((await pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', versao: 1, corpo: pessoa({ nome: 'Editada' }) })).status).toBe(200);
    await Promise.all([SEM_GRUPO, CADASTRO, EDICAO].map(async (sujeito) => {
      expect((await pedir(sujeito)).status).toBe(403);
      expect((await pedir(sujeito, `${ROTA}/${id}`)).status).toBe(403);
    }));
    await Promise.all([SEM_GRUPO, LEITOR, EDICAO].map(async (sujeito) => {
      expect((await pedir(sujeito, ROTA, { metodo: 'POST', corpo: pessoa({ documento: null }) })).status).toBe(403);
    }));
    await Promise.all([SEM_GRUPO, LEITOR, CADASTRO].map(async (sujeito) => {
      expect((await pedir(sujeito, `${ROTA}/${id}`, { metodo: 'PUT', versao: 2, corpo: pessoa() })).status).toBe(403);
    }));
    expect(await quantidade()).toBe(1);
  });

  it('cadastra com versão, Location e no-store; perfil futuro permanece nulo', async () => {
    const resposta = await pedir(GERENTE, ROTA, { metodo: 'POST', corpo: pessoa({ nome: ' Pessoa ' }) });
    expect(resposta.status).toBe(201);
    expect(resposta.corpo).toEqual({ id: expect.any(String), nome: 'Pessoa', tipo: 'FISICA', documento: DOCUMENTO, ativa: true, versao: 1 });
    expect(resposta.localizacao).toBe(`${ROTA}/${resposta.corpo['id'] as string}`);
    expect(resposta.cache).toBe('no-store');
    const leitura = await pedir(LEITOR, resposta.localizacao!);
    expect(leitura.corpo).toEqual(resposta.corpo);
    expect(leitura.cache).toBe('no-store');
    const [linha] = await consultarNaInstituicao(banco, INSTITUICAO_A, 'select * from pessoas.pessoa');
    expect(linha).toMatchObject({ apelido: null, telefone: null, email: null, cidade: null, nascimento: null,
      foto_anexo_id: null, relacao_com_a_casa: null, contato_emergencia_nome: null, contato_emergencia_tel: null,
      anonimizada_em: null, cadastrada_por_link: false });
  });

  it('aceita CPF/CNPJ ausente em mais de uma pessoa e CNPJ na jurídica', async () => {
    await cadastrar({ documento: null });
    await cadastrar({ documento: null });
    await cadastrar({ tipo: 'JURIDICA', documento: '12345678901234' });
    expect(await quantidade()).toBe(3);
  });

  it.each([
    { nome: ' ' }, { documento: '123.456.789-01' }, { documento: '123' },
    { tipo: 'JURIDICA' }, { tipo: 'OUTRO' },
  ])('valida a forma antes de gravar: %j', async (campos) => {
    const resposta = await pedir(GERENTE, ROTA, { metodo: 'POST', corpo: pessoa(campos) });
    expect([resposta.status, resposta.corpo['erro']]).toEqual([400, 'CORPO_INVALIDO']);
    expect(await quantidade()).toBe(0);
  });

  it('documento duplicado falha no cadastro e na edição sem deixar evento ou alteração parcial', async () => {
    const id = await cadastrar();
    const outro = await cadastrar({ documento: null, nome: 'Outro' });
    const duplicada = await pedir(GERENTE, ROTA, { metodo: 'POST', corpo: pessoa() });
    expect([duplicada.status, duplicada.corpo['erro']]).toEqual([409, 'DOCUMENTO_JA_CADASTRADO']);
    const editada = await pedir(GERENTE, `${ROTA}/${outro}`, { metodo: 'PUT', versao: 1, corpo: pessoa({ nome: 'Não pode gravar' }) });
    expect([editada.status, editada.corpo['erro']]).toEqual([409, 'DOCUMENTO_JA_CADASTRADO']);
    expect((await pedir(LEITOR, `${ROTA}/${outro}`)).corpo).toMatchObject({ nome: 'Outro', documento: null, versao: 1 });
    const eventos = await banco.owner.query('select tipo from shared.outbox where agregado_tipo = $1 and agregado_id in ($2, $3)', ['Pessoa', id, outro]);
    expect(eventos.rows).toEqual([{ tipo: 'PESSOA_CADASTRADA' }, { tipo: 'PESSOA_CADASTRADA' }]);
    expect(await quantidade()).toBe(2);
  });

  it('isola leitura, busca e edição; o mesmo documento pode existir em outra casa', async () => {
    const idA = await cadastrar();
    expect((await pedir(OUTRA_CASA)).corpo).toEqual({ itens: [], proxima: null });
    expect((await pedir(OUTRA_CASA, `${ROTA}?busca=${DOCUMENTO}`)).corpo['itens']).toEqual([]);
    expect((await pedir(OUTRA_CASA, `${ROTA}/${idA}`)).status).toBe(404);
    expect((await pedir(OUTRA_CASA, `${ROTA}/${idA}`, { metodo: 'PUT', versao: 1, corpo: pessoa() })).status).toBe(404);
    const idB = await cadastrar({}, OUTRA_CASA);
    expect((await pedir(LEITOR, `${ROTA}/${idB}`)).status).toBe(404);
    expect((await pedir(LEITOR)).corpo['itens']).toEqual([expect.objectContaining({ id: idA })]);
  });

  it('edita os campos mínimos sem preencher ou apagar colunas futuras', async () => {
    const id = await cadastrar();
    await gravarNaInstituicao(banco, INSTITUICAO_A, "update pessoas.pessoa set apelido = 'Apelido preservado' where id = $1", [id]);
    const resposta = await pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', versao: 1, corpo: pessoa({ nome: ' Empresa ', tipo: 'JURIDICA', documento: '12345678901234', telefone: 'não deve gravar' }) });
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({ id, nome: 'Empresa', tipo: 'JURIDICA', documento: '12345678901234', versao: 2 });
    const [linha] = await consultarNaInstituicao(banco, INSTITUICAO_A, 'select apelido, telefone from pessoas.pessoa where id = $1', [id]);
    expect(linha).toEqual({ apelido: 'Apelido preservado', telefone: null });
    const removido = await pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', versao: 2, corpo: pessoa({ documento: null }) });
    expect(removido.status).toBe(200);
    expect(removido.corpo).toMatchObject({ documento: null, versao: 3 });
  });

  it('exige If-Match, recusa versão antiga e desconhecidos, sem alterar os dados', async () => {
    const id = await cadastrar();
    expect((await pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', corpo: pessoa() })).status).toBe(428);
    const velha = await pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', versao: 2, corpo: pessoa({ nome: 'Outro' }) });
    expect([velha.status, velha.corpo['erro']]).toEqual([409, 'VERSAO_DESATUALIZADA']);
    expect((await pedir(LEITOR, `${ROTA}/${UUID_AUSENTE}`)).status).toBe(404);
    expect((await pedir(EDICAO, `${ROTA}/${UUID_AUSENTE}`, { metodo: 'PUT', versao: 1, corpo: pessoa() })).status).toBe(404);
    expect((await pedir(LEITOR, `${ROTA}/${id}`)).corpo).toMatchObject({ nome: 'Pessoa de teste', versao: 1 });
  });

  it('editores concorrentes não sobrescrevem silenciosamente a mesma versão', async () => {
    const id = await cadastrar();
    const respostas = await Promise.all(['Primeiro', 'Segundo'].map((nome) => pedir(EDICAO, `${ROTA}/${id}`, { metodo: 'PUT', versao: 1, corpo: pessoa({ nome }) })));
    expect(respostas.map(({ status }) => status).toSorted()).toEqual([200, 409]);
    expect((await pedir(LEITOR, `${ROTA}/${id}`)).corpo['versao']).toBe(2);
    const { rows } = await banco.owner.query('select tipo from shared.outbox where agregado_id = $1', [id]);
    expect(rows.filter(({ tipo }) => tipo === 'PESSOA_EDITADA')).toHaveLength(1);
  });

  it('busca por nome e documento, tratando curingas literalmente', async () => {
    const id = await cadastrar({ nome: 'Ana Silva' });
    const literal = await cadastrar({ nome: 'Ana %_\\ teste', documento: null });
    expect((await pedir(LEITOR, `${ROTA}?busca=sILvA`)).corpo['itens']).toEqual([expect.objectContaining({ id })]);
    expect((await pedir(LEITOR, `${ROTA}?busca=456789`)).corpo['itens']).toEqual([expect.objectContaining({ id })]);
    expect((await pedir(LEITOR, `${ROTA}?busca=${encodeURIComponent('%_\\')}`)).corpo['itens']).toEqual([expect.objectContaining({ id: literal })]);
  });

  it('pagina por nome e id sem omitir pessoas de mesmo nome', async () => {
    const ids = [await cadastrar({ nome: 'Ana', documento: null }), await cadastrar({ nome: 'Ana', documento: null }), await cadastrar({ nome: 'Bia', documento: null })];
    const primeira = await pedir(LEITOR, `${ROTA}?limite=1`);
    const segunda = await pedir(LEITOR, `${ROTA}?limite=1&depois=${primeira.corpo['proxima'] as string}`);
    const terceira = await pedir(LEITOR, `${ROTA}?limite=1&depois=${segunda.corpo['proxima'] as string}`);
    expect([primeira, segunda, terceira].flatMap(({ corpo }) => (corpo['itens'] as Array<{ id: string }>).map(({ id }) => id))).toEqual(ids);
    expect(terceira.corpo['proxima']).toBe(null);
    expect(primeira.cache).toBe('no-store');
    await Promise.all(['?limite=0', '?limite=101', '?depois=invalido', '?depois=e30', '?busca=%00'].map(async (query) => {
      expect((await pedir(LEITOR, ROTA + query)).status).toBe(400);
    }));
  });

  it('replay idempotente guarda só status/Location; o outbox também não copia dados pessoais', async () => {
    const pedido = { metodo: 'POST', corpo: pessoa(), chave: CHAVE } as const;
    const primeira = await pedir(GERENTE, ROTA, pedido);
    const segunda = await pedir(GERENTE, ROTA, pedido);
    expect(primeira.status).toBe(201);
    expect(segunda.status).toBe(201);
    expect(segunda.localizacao).toBe(primeira.localizacao);
    expect(segunda.texto).toBe('');
    expect(await quantidade()).toBe(1);
    const [chave] = await consultarNaInstituicao(banco, INSTITUICAO_A, 'select resposta from shared.chave_de_idempotencia where chave = $1', [CHAVE]);
    expect(chave).toEqual({ resposta: { corpo: null, location: primeira.localizacao } });
    const { rows } = await banco.owner.query('select payload from shared.outbox where agregado_id = $1', [primeira.corpo['id']]);
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ pessoaId: primeira.corpo['id'], autorId: expect.any(String) });
    expect(JSON.stringify(rows)).not.toContain(DOCUMENTO);
  });

  it('falha ao gravar evento desfaz pessoa e chave; repetir a requisição pode concluir', async () => {
    const gravar = vi.spyOn(aplicacao.app.get(RepositorioDoOutbox), 'gravar');
    gravar.mockRejectedValueOnce(new Error('falha de outbox simulada'));
    const pedido = { metodo: 'POST', corpo: pessoa(), chave: CHAVE } as const;
    const falha = await pedir(GERENTE, ROTA, pedido);
    expect(falha.status).toBe(500);
    expect(await quantidade()).toBe(0);
    gravar.mockRestore();
    expect((await pedir(GERENTE, ROTA, pedido)).status).toBe(201);
    expect(await quantidade()).toBe(1);
  });

  it('cursor gerado para nome Unicode no limite pode ser enviado de volta à API', async () => {
    const nome = 'ç'.repeat(200);
    const primeiroId = await cadastrar({ nome, documento: null });
    const segundoId = await cadastrar({ nome, documento: null });
    const primeira = await pedir(LEITOR, `${ROTA}?limite=1`);
    const cursor = primeira.corpo['proxima'] as string;
    expect(cursor.length).toBeGreaterThan(512);
    const segunda = await pedir(LEITOR, `${ROTA}?limite=1&depois=${cursor}`);
    expect(segunda.status).toBe(200);
    expect(primeira.corpo['itens']).toEqual([expect.objectContaining({ id: primeiroId })]);
    expect(segunda.corpo['itens']).toEqual([expect.objectContaining({ id: segundoId })]);
    expect(segunda.corpo['proxima']).toBe(null);
  });

  it('conta pessoal exige titular existente e ativo na própria instituição', async () => {
    const id = await cadastrar();
    const idB = await cadastrar({}, OUTRA_CASA);
    const criarConta = (pessoaTitularId: string) => pedir(GERENTE, '/api/v1/financeiro/contas', {
      metodo: 'POST', corpo: { nome: 'Pessoal', tipo: 'CONTA_CORRENTE', titularidade: 'PESSOAL_DE_TERCEIRO', pessoaTitularId },
    });
    expect((await criarConta(UUID_AUSENTE)).status).toBe(404);
    expect((await criarConta(idB)).status).toBe(404);
    expect((await criarConta(id)).status).toBe(201);
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update pessoas.pessoa set ativa = false where id = $1', [id]);
    expect((await criarConta(id)).status).toBe(422);
  });
});
