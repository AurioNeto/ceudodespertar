import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { SituacaoDoPeriodo } from '../../src/modules/financeiro/application/lancamentos/situacao-do-periodo.js';
import { AUTOR, OUTRO, TESOURARIA, CASA_B, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';

describe('conversa de pendências de lançamento', () => {
  let banco: BancoDeTeste;
  let app: AplicacaoDeAcesso;
  let rota: string;
  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    const setup = await subirLancamentos(banco); app = setup.app;
    const r = await pedirLancamento(app, AUTOR, ROTA, 'POST', setup.completo);
    expect(r.status).toBe(201); rota = r.location!;
  });
  afterEach(async () => { await app.encerrar(); await derrubarBancoDeTeste(banco); });
  const abrir = (sujeito = TESOURARIA, versao = 1) => pedirLancamento(app, sujeito, `${rota}/pendencias`, 'POST', { texto: 'De qual cerimônia?' }, versao);
  const responder = (id: string, sujeito = AUTOR, versao = 2) => pedirLancamento(app, sujeito, `${rota}/pendencias/${id}/resposta`, 'POST', { texto: 'Da cerimônia de outubro' }, versao);
  const idDaPendencia = (r: { corpo: Record<string, unknown> }) => (r.corpo['pendencias'] as Array<{ id: string }>)[0]!.id;

  it('abre para o registrador e resposta resolve só a conversa, permitindo posterior conferência', async () => {
    const aberta = await abrir();
    expect(aberta.status).toBe(200);
    expect(aberta.corpo).toMatchObject({ status: 'A_CONFERIR', versao: 2 });
    expect((aberta.corpo['pendencias'] as object[])[0]).toMatchObject({ texto: 'De qual cerimônia?', resposta: null, resolvidaEm: null });
    expect((await pedirLancamento(app, TESOURARIA, `${rota}/confirmar`, 'POST', {}, 2)).corpo['erro']).toBe('LANCAMENTO_INCOMPLETO');
    const resposta = await responder(idDaPendencia(aberta));
    expect(resposta.status).toBe(200);
    expect(resposta.corpo).toMatchObject({ status: 'A_CONFERIR', versao: 3, pendencias: [expect.objectContaining({ resposta: 'Da cerimônia de outubro', resolvidaEm: expect.any(String) })] });
    expect((await pedirLancamento(app, TESOURARIA, `${rota}/confirmar`, 'POST', {}, 3)).status).toBe(200);
  });
  it('autor não abre pergunta para si, registro comum não abre pergunta e terceiro não responde', async () => {
    expect((await abrir(AUTOR)).status).toBe(403);
    const aberta = await abrir();
    expect((await responder(idDaPendencia(aberta), TESOURARIA)).corpo['erro']).toBe('PENDENCIA_SO_DO_DESTINATARIO');
    expect((await responder(idDaPendencia(aberta), OUTRO)).status).toBe(404);
  });
  it('self-review continua permitido, mas pergunta para si mesmo é recusada pelo domínio', async () => {
    const l = await pedirLancamento(app, TESOURARIA, ROTA, 'POST', { natureza: 'DESPESA', valor: 100, motivo: 'Registro' });
    const r = await pedirLancamento(app, TESOURARIA, `${l.location}/pendencias`, 'POST', { texto: 'Pergunta' }, 1);
    expect(r.corpo['erro']).toBe('PENDENCIA_PARA_SI_MESMO');
  });
  it('uma aberta por vez; depois da resposta pode haver nova pergunta e histórico preservado', async () => {
    const aberta = await abrir();
    expect((await abrir(TESOURARIA, 2)).corpo['erro']).toBe('PENDENCIA_JA_ABERTA');
    await responder(idDaPendencia(aberta));
    expect((await responder(idDaPendencia(aberta), AUTOR, 3)).status).toBe(404);
    const nova = await abrir(TESOURARIA, 3);
    expect(nova.status).toBe(200);
    expect(nova.corpo['pendencias']).toHaveLength(2);
    expect(nova.corpo['versao']).toBe(4);
  });
  it('exige versão e id válidos e não acessa dados de outra casa', async () => {
    expect((await pedirLancamento(app, TESOURARIA, `${rota}/pendencias`, 'POST', { texto: 'Pergunta' })).status).toBe(428);
    expect((await abrir(TESOURARIA, 99)).status).toBe(409);
    expect((await abrir(CASA_B)).status).toBe(404);
    const aberta = await abrir();
    expect((await responder(idDaPendencia(aberta), CASA_B)).status).toBe(404);
    expect((await responder('invalido')).status).toBe(400);
    expect((await responder('0198a3c0-0000-7000-8000-0000000000ff')).status).toBe(404);
  });
  it('L5 — período fechado impede abrir e responder', async () => {
    const aberta = await abrir();
    vi.spyOn(app.app.get(SituacaoDoPeriodo), 'estaAberto').mockResolvedValue(false);
    expect((await responder(idDaPendencia(aberta))).corpo['erro']).toBe('PERIODO_FECHADO');
    expect((await abrir(TESOURARIA, 2)).corpo['erro']).toBe('PERIODO_FECHADO');
  });
  it('perguntas concorrentes não criam duas pendências abertas', async () => {
    const respostas = await Promise.all([abrir(), abrir()]);
    expect(respostas.map((r) => r.status).toSorted()).toEqual([200, 409]);
    expect((await pedirLancamento(app, AUTOR, rota)).corpo['pendencias']).toHaveLength(1);
  });
});
