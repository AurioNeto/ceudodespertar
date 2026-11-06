import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste, type BancoDeTeste } from '../integracao/banco-de-teste.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { idDoCadastro } from './apoio-http.js';
import { AUTOR, CASA_B, TESOURARIA, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';

const ROTA_EVENTOS = '/api/v1/financeiro/eventos';
const CRIADOR = 'sub-criador-evento-minimo';
const CRIADOR_B = 'sub-criador-evento-minimo-b';
const DADOS = { nome: '  Cerimônia de outubro  ', tipo: 'CERIMONIA', dataInicio: '2026-10-01', dataFim: '2026-10-02' };

describe('Evento mínimo e lançamento pela API', () => {
  let banco: BancoDeTeste;
  let ambiente: Awaited<ReturnType<typeof subirLancamentos>>;
  let unidadeB: string;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    ambiente = await subirLancamentos(banco);
    const grupo = novoGrupoNomeado('Criar evento mínimo', ['eventos.evento.criar']);
    const grupoB = novoGrupoNomeado('Criar evento mínimo B', ['eventos.evento.criar']);
    await semearUsuarios(ambiente.app, INSTITUICAO_A, [grupo], [usuarioAtivoEm(CRIADOR, [grupo])]);
    await semearUsuarios(ambiente.app, INSTITUICAO_B, [grupoB], [usuarioAtivoEm(CRIADOR_B, [grupoB])]);
    unidadeB = await idDoCadastro(banco, INSTITUICAO_B, 'unidade', 'CDD');
  });

  afterEach(async () => {
    await ambiente.app.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  function criar(sujeito = CRIADOR, dados: Record<string, unknown> = {}) {
    return pedirLancamento(ambiente.app, sujeito, ROTA_EVENTOS, 'POST', { ...DADOS, unidadeId: ambiente.completo.unidadeId, ...dados });
  }

  it('cria resumo consultável e preserva o vínculo na confirmação', async () => {
    const evento = await criar();
    expect(evento.status).toBe(201);
    expect(evento.location).toBe(`${ROTA_EVENTOS}/${evento.corpo['id'] as string}`);
    expect(evento.corpo).toMatchObject({ nome: 'Cerimônia de outubro', tipo: 'CERIMONIA', dataInicio: '2026-10-01', dataFim: '2026-10-02' });
    expect((await pedirLancamento(ambiente.app, AUTOR, evento.location!)).corpo).toEqual(evento.corpo);

    const l = await pedirLancamento(ambiente.app, AUTOR, ROTA, 'POST', { ...ambiente.completo, eventoId: evento.corpo['id'] });
    expect(l.status).toBe(201);
    const confirmado = await pedirLancamento(ambiente.app, TESOURARIA, `${l.location}/confirmar`, 'POST', {}, 1);
    expect(confirmado.status).toBe(200);
    expect(confirmado.corpo['eventoId']).toBe(evento.corpo['id']);
  });

  it('isola o evento e a unidade e recusa referência de lançamento de outra instituição', async () => {
    expect((await criar(CRIADOR, { unidadeId: unidadeB })).status).toBe(404);
    const evento = await criar(CRIADOR_B, { unidadeId: unidadeB });
    expect(evento.status).toBe(201);
    expect((await pedirLancamento(ambiente.app, CASA_B, evento.location!)).status).toBe(200);
    expect((await pedirLancamento(ambiente.app, AUTOR, evento.location!)).status).toBe(404);

    const l = await pedirLancamento(ambiente.app, AUTOR, ROTA, 'POST', ambiente.completo);
    const dados = { ...ambiente.completo, eventoId: evento.corpo['id'] };
    expect((await pedirLancamento(ambiente.app, AUTOR, ROTA, 'POST', dados)).status).toBe(404);
    expect((await pedirLancamento(ambiente.app, AUTOR, l.location!, 'PUT', dados, 1)).status).toBe(404);
  });

  it('exige permissão de criação, intervalo válido e unidade ativa', async () => {
    expect((await criar(AUTOR)).status).toBe(403);
    expect((await criar(CRIADOR, { dataFim: '2026-09-30' })).status).toBe(400);
    expect((await criar(CRIADOR, { tipo: 'OUTRO' })).status).toBe(400);
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.unidade set ativa = false where id = $1', [ambiente.completo.unidadeId]);
    const recusado = await criar();
    expect(recusado.corpo['erro']).toBe('CADASTRO_INATIVO');
  });
  it('reverte as duas migrations sem alterar os lançamentos existentes', async () => {
    const l = await pedirLancamento(ambiente.app, AUTOR, ROTA, 'POST', ambiente.completo);
    expect(l.status).toBe(201);
    const [eventoDown, anexoDown] = await Promise.all([
      readFile(new URL('../../src/banco/migracoes/b1-008-evento-minimo/desfazer.sql', import.meta.url), 'utf8'),
      readFile(new URL('../../src/banco/migracoes/b1-007-anexo/desfazer.sql', import.meta.url), 'utf8'),
    ]);
    await banco.owner.query('begin');
    try {
      await banco.owner.query(eventoDown);
      await banco.owner.query(anexoDown);
      const { rows } = await banco.owner.query(`select
        to_regclass('eventos.evento') as evento, to_regclass('shared.anexo') as anexo,
        to_regclass('financeiro.lancamento')::text as lancamento`);
      expect(rows).toEqual([{ evento: null, anexo: null, lancamento: 'financeiro.lancamento' }]);
    } finally {
      await banco.owner.query('rollback');
    }
    expect((await pedirLancamento(ambiente.app, AUTOR, l.location!)).status).toBe(200);
  });

});
