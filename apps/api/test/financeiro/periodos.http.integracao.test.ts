import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { idDoCadastro } from './apoio-http.js';
import { AUTOR, TESOURARIA, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';
const FECHAR = 'sub-fechar'; const REABRIR = 'sub-reabrir'; const CASA_B = 'sub-periodos-b';
const CONTA_DESTINO = '0198a3c0-0000-7000-8000-0000000000c2';

describe('períodos contábeis pela API', () => {
  let banco: BancoDeTeste; let app: AplicacaoDeAcesso; let completo: Record<string, unknown>; let rota: string; let unidade: string;
  beforeEach(async () => {
    banco = await criarBancoDeTeste(); ({ app, completo } = await subirLancamentos(banco));
    const fecha = novoGrupoNomeado('Fechar períodos', ['financeiro.periodo.fechar']);
    const reabre = novoGrupoNomeado('Reabrir períodos', ['financeiro.periodo.reabrir']);
    await semearUsuarios(app, INSTITUICAO_A, [fecha, reabre], [usuarioAtivoEm(FECHAR, [fecha]), usuarioAtivoEm(REABRIR, [reabre])]);
    const b = novoGrupoNomeado('Períodos B', ['financeiro.periodo.fechar', 'financeiro.periodo.reabrir']);
    await semearUsuarios(app, INSTITUICAO_B, [b], [usuarioAtivoEm(CASA_B, [b])]);
    unidade = completo['unidadeId'] as string; rota = `/api/v1/financeiro/periodos/${unidade}/2026-10`;
  });
  afterEach(async () => { await app.encerrar(); await derrubarBancoDeTeste(banco); });
  const pedir = (s: string, caminho: string, metodo?: 'POST' | 'PUT' | 'DELETE', corpo?: unknown, versao?: number, chave?: string) => pedirLancamento(app, s, caminho, metodo, corpo, versao, chave);
  const fechar = (caminho = rota, versao = 0) => pedir(FECHAR, `${caminho}/fechar`, 'POST', {}, versao);
  const registrar = async () => { const r = await pedir(AUTOR, ROTA, 'POST', completo); expect(r.status).toBe(201); return r.location!; };
  const confirmar = async () => { const r = await registrar(); expect((await pedir(TESOURARIA, `${r}/confirmar`, 'POST', {}, 1)).status).toBe(200); return r; };
  it('primeiro fechamento vazio, leitura, integridade e versão', async () => {
    expect((await pedir(FECHAR, rota)).status).toBe(404);
    const r = await fechar(); expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ fechado: true, versao: 1, hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect((await pedir(FECHAR, `${rota}/integridade`)).corpo).toEqual({ hashGravado: r.corpo['hash'], hashAtual: r.corpo['hash'], integro: true });
    expect((await fechar()).status).toBe(409);
    expect((await fechar(rota, 1)).corpo['erro']).toBe('PERIODO_JA_FECHADO');
  });
  it('permissões são distintas, If-Match obrigatório e instituição não vaza', async () => {
    expect((await pedir(AUTOR, `${rota}/fechar`, 'POST', {}, 0)).status).toBe(403);
    expect((await pedir(REABRIR, `${rota}/fechar`, 'POST', {}, 0)).status).toBe(403);
    expect((await pedir(FECHAR, `${rota}/fechar`, 'POST', {})).status).toBe(428);
    expect((await pedir(CASA_B, `${rota}/fechar`, 'POST', {}, 0)).status).toBe(404);
    await fechar();
    expect((await pedir(CASA_B, rota)).status).toBe(404);
    expect((await pedir(CASA_B, `${rota}/reabrir`, 'POST', { motivo: 'Corrigir classificação' }, 1)).status).toBe(404);
    expect((await pedir(FECHAR, `${rota}/reabrir`, 'POST', { motivo: 'Corrigir classificação' }, 1)).status).toBe(403);
  });
  it('P1 impede fechamento com lançamento pendente e permite após conferir', async () => {
    const l = await registrar();
    expect((await fechar()).corpo).toMatchObject({ erro: 'PERIODO_COM_PENDENCIAS', detalhes: { quantidade: 1 } });
    expect((await pedir(TESOURARIA, `${l}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    expect((await fechar()).status).toBe(200);
  });
  it('P4 exige anterior fechado depois do início do histórico, inclusive em lacunas', async () => {
    await confirmar();
    const dezembro = rota.replace('2026-10', '2026-12');
    expect((await fechar(dezembro)).corpo['erro']).toBe('PERIODO_ANTERIOR_ABERTO');
    await fechar();
    const novembro = rota.replace('2026-10', '2026-11');
    expect((await fechar(novembro)).status).toBe(200);
    expect((await fechar(dezembro)).status).toBe(200);
    expect((await pedir(REABRIR, `${novembro}/reabrir`, 'POST', { motivo: 'Revisar competência' }, 1)).status).toBe(200);
    expect((await fechar(rota.replace('2026-10', '2027-01'))).status).toBe(200);
  });
  it('P3 exige motivo e preserva cada hash anterior; permite novo fechamento e nova reabertura', async () => {
    const primeiro = await fechar();
    expect((await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'curto' }, 1)).status).toBe(400);
    expect((await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'Correção do período' }, 99)).status).toBe(409);
    const aberto = await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'Correção do período' }, 1);
    expect(aberto.corpo).toMatchObject({ fechado: false, hash: null, versao: 2, reaberturas: [{ hashAnterior: primeiro.corpo['hash'] }] });
    expect((await pedir(FECHAR, `${rota}/integridade`)).corpo['integro']).toBeNull();
    const segundo = await fechar(rota, 2); expect(segundo.corpo['versao']).toBe(3);
    expect((await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'Segunda correção' }, 3)).corpo['versao']).toBe(4);
    expect(((await pedir(FECHAR, rota)).corpo['reaberturas'] as unknown[])).toHaveLength(2);
  });
  it('fechamento bloqueia registro e edição para o mês fechado', async () => {
    await fechar();
    expect((await pedir(AUTOR, ROTA, 'POST', completo)).corpo['erro']).toBe('PERIODO_FECHADO');
    const semMes = await pedir(AUTOR, ROTA, 'POST', { natureza: 'DESPESA', valor: 2000, motivo: 'Sem competência' });
    expect(semMes.status).toBe(201);
    expect((await pedir(AUTOR, semMes.location!, 'PUT', completo, 1)).corpo['erro']).toBe('PERIODO_FECHADO');
  });
  it('estorno usa mês corrente sem alterar hash antigo', async () => {
    const l = await confirmar();
    const fechado = await fechar();
    expect((await pedir(TESOURARIA, `${l}/estornar`, 'POST', { motivo: 'Correção' }, 2)).status).toBe(201);
    expect((await pedir(FECHAR, `${rota}/integridade`)).corpo).toMatchObject({ integro: true, hashAtual: fechado.corpo['hash'] });
  });
  it('transferência pertence às duas unidades: P1, hash e bloqueio no destino', async () => {
    const destino = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'MUNAY');
    await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.conta (id, instituicao_id, nome, tipo, titularidade) values ($1, $2, 'Destino', 'DINHEIRO', 'INSTITUCIONAL')", [CONTA_DESTINO, INSTITUICAO_A]);
    const grupo = novoGrupoNomeado('Transferir', ['financeiro.transferencia.registrar']);
    await semearUsuarios(app, INSTITUICAO_A, [grupo], [usuarioAtivoEm('sub-transferir', [grupo])]);
    const dados = { finalidade: 'REPASSE_ENTRE_UNIDADES', valor: 1000, data: '2026-10-01', motivo: 'Repasse', contaOrigemId: completo['contaId'], contaDestinoId: CONTA_DESTINO, unidadeId: unidade, unidadeDestinoId: destino };
    const t = await pedir('sub-transferir', '/api/v1/financeiro/transferencias', 'POST', dados);
    expect(t.status).toBe(201);
    const periodoDestino = rota.replace(unidade, destino);
    expect((await fechar()).corpo['erro']).toBe('PERIODO_COM_PENDENCIAS');
    expect((await fechar(periodoDestino)).corpo['erro']).toBe('PERIODO_COM_PENDENCIAS');
    expect((await pedir(TESOURARIA, `${t.location}/confirmar`, 'POST', {}, 1)).status).toBe(200);
    expect((await fechar(periodoDestino)).status).toBe(200);
    expect((await pedir('sub-transferir', '/api/v1/financeiro/transferencias', 'POST', dados)).corpo['erro']).toBe('PERIODO_FECHADO');
    const r = await fechar(); expect(r.status).toBe(200);
    expect((await pedir(FECHAR, `${rota}/integridade`)).corpo['integro']).toBe(true);
    await banco.owner.query('alter table financeiro.transferencia disable trigger transferencia_guarda');
    await gravarNaInstituicao(banco, INSTITUICAO_A, 'update financeiro.transferencia set valor = valor + 1 where id = $1', [t.corpo['id']]);
    await banco.owner.query('alter table financeiro.transferencia enable trigger transferencia_guarda');
    expect((await pedir(FECHAR, `${rota}/integridade`)).corpo).toMatchObject({ hashGravado: r.corpo['hash'], integro: false });
    expect((await pedir(FECHAR, `${periodoDestino}/integridade`)).corpo['integro']).toBe(false);
  });
  it('replay não repete reabertura nem guarda o motivo no outbox', async () => {
    await fechar();
    const chave = '0198a3c0-0000-7000-8000-0000000000f1';
    const r = await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'Correção do fechamento' }, 1, chave);
    expect(r.status).toBe(200);
    expect((await pedir(REABRIR, `${rota}/reabrir`, 'POST', { motivo: 'Correção do fechamento' }, 1, chave)).corpo).toEqual({});
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select count(*) as n from financeiro.reabertura_de_periodo')).toEqual([{ n: 1 }]);
    const { rows } = await banco.owner.query("select payload from shared.outbox where tipo = 'PERIODO_REABERTO'");
    expect(JSON.stringify(rows)).not.toContain('Correção');
  });
});
