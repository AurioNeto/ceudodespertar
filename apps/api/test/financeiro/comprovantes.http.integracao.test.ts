import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { ArmazenamentoDeArquivos } from '../../src/shared/infrastructure/arquivos/armazenamento-de-arquivos.js';
import { erroDeDominio, ErroDeDominioException } from '../../src/shared/kernel/erro-de-dominio.js';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste, type BancoDeTeste } from '../integracao/banco-de-teste.js';
import { AUTOR, OUTRO, TESOURARIA, CASA_B, ROTA, subirLancamentos, pedirLancamento } from './apoio-lancamentos.js';

const PDF = '%PDF-1.4\nfixture';
const URL = 'http://storage.test/assinada';

describe('Comprovantes de lançamento pela API', () => {
  let banco: BancoDeTeste;
  let ambiente: Awaited<ReturnType<typeof subirLancamentos>>;
  let rota: string;
  let gravar: MockInstance<ArmazenamentoDeArquivos['gravar']>;
  let assinar: MockInstance<ArmazenamentoDeArquivos['urlDeLeitura']>;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    ambiente = await subirLancamentos(banco);
    const storage = ambiente.app.app.get(ArmazenamentoDeArquivos);
    gravar = vi.spyOn(storage, 'gravar').mockResolvedValue(undefined);
    assinar = vi.spyOn(storage, 'urlDeLeitura').mockResolvedValue(URL);
    const l = await pedirLancamento(ambiente.app, AUTOR, ROTA, 'POST', ambiente.completo);
    expect(l.status).toBe(201);
    rota = l.location!;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await ambiente.app.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  function enviar(sujeito = AUTOR, versao = 1, conteudo = PDF, tipo = 'application/pdf') {
    const corpo = new FormData();
    corpo.append('arquivo', new Blob([conteudo], { type: tipo }), 'recibo.pdf');
    return ambiente.app.pedirComo(sujeito, `${rota}/comprovante`, { metodo: 'PUT', corpo, cabecalhos: { 'if-match': String(versao) } });
  }
  function ler(sujeito = AUTOR) {
    return ambiente.app.pedirComo(sujeito, `${rota}/comprovante`);
  }

  it('valida conteúdo, vincula na versão seguinte e autoriza leitura pelo lançamento', async () => {
    expect((await ler()).status).toBe(404);
    const resposta = await enviar();
    expect(resposta.status).toBe(200);
    const l = await resposta.json() as { comprovanteId: string; versao: number };
    expect(l.versao).toBe(2);
    const chave = `${INSTITUICAO_A}/financeiro/${l.comprovanteId}`;
    expect(gravar).toHaveBeenCalledWith(chave, Buffer.from(PDF), 'application/pdf');
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select sha256 from shared.anexo')).toEqual([
      { sha256: createHash('sha256').update(PDF).digest('hex') },
    ]);
    expect(await consultarNaInstituicao(banco, INSTITUICAO_B, 'select id from shared.anexo')).toEqual([]);
    expect((await ler(OUTRO)).status).toBe(404);
    expect((await ler(CASA_B)).status).toBe(404);
    expect(assinar).not.toHaveBeenCalled();
    const leitura = await ler(TESOURARIA);
    expect(leitura.headers.get('cache-control')).toBe('no-store');
    expect(await leitura.json()).toMatchObject({ id: l.comprovanteId, nome: 'recibo.pdf', url: URL });
    expect(assinar).toHaveBeenCalledWith(chave);

    const copia = await pedirLancamento(ambiente.app, OUTRO, ROTA, 'POST', { ...ambiente.completo, comprovanteId: l.comprovanteId });
    expect(copia.status).toBe(404);
    const editado = await pedirLancamento(ambiente.app, AUTOR, rota, 'PUT', ambiente.completo, 2);
    expect(editado.corpo['comprovanteId']).toBe(l.comprovanteId);
    expect((await pedirLancamento(ambiente.app, TESOURARIA, `${rota}/confirmar`, 'POST', {}, 3)).status).toBe(200);
    expect((await enviar(AUTOR, 4)).status).toBe(409);
    expect(gravar).toHaveBeenCalledOnce();
    const estorno = await pedirLancamento(ambiente.app, TESOURARIA, `${rota}/estornar`, 'POST', { motivo: 'Correção' }, 4);
    expect(estorno.status).toBe(201);
    expect(estorno.corpo['comprovanteId']).toBeNull();
  });

  it('recusa troca de instituição, autoria, versão, tipo e tamanho antes do S3', async () => {
    expect((await enviar(CASA_B)).status).toBe(404);
    expect((await enviar(OUTRO)).status).toBe(404);
    expect((await enviar(AUTOR, 2)).status).toBe(409);
    expect((await enviar(AUTOR, 1, '<html>')).status).toBe(400);
    expect((await enviar(AUTOR, 1, PDF, 'text/html')).status).toBe(400);
    expect((await enviar(AUTOR, 1, PDF.padEnd(10 * 1024 * 1024 + 2, 'x'))).status).toBe(413);
    expect(gravar).not.toHaveBeenCalled();
  });

  it('falha no S3 desfaz vínculo, versão e metadados', async () => {
    gravar.mockRejectedValueOnce(new ErroDeDominioException(erroDeDominio('SERVICO_INDISPONIVEL')));
    expect((await enviar()).status).toBe(503);
    expect((await ler()).status).toBe(404);
    expect(await consultarNaInstituicao(banco, INSTITUICAO_A, 'select id from shared.anexo')).toEqual([]);
    expect((await enviar()).status).toBe(200);
  });
});
