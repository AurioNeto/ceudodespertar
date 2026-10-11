import { describe, expect, it } from 'vitest';
import { INICIAL } from '../mocks/formularioInicial';
import { regrasDoLancamento } from './regrasDoLancamento';

describe('regrasDoLancamento', () => {
  it('saída com os campos iniciais — nada bloqueia, sem categoria e com reembolso', () => {
    const regras = regrasDoLancamento('SAIDA', INICIAL, false);

    expect(regras).toMatchObject({
      ehSaida: true,
      semCategoria: true,
      bloqueado: false,
      motivoBloqueio: undefined,
      total: 0,
      conta: 'Cora PJ',
      contaDestino: 'Nubank Paty',
      temGrupo: true,
      temReembolso: true,
    });
  });

  it.each([
    ['187,40', 187.4],
    ['1.234,56', 1234.56],
    ['65+70', 135],
    ['abc+10', 10],
  ])('valor %s soma %s', (valor, total) => {
    expect(regrasDoLancamento('SAIDA', { ...INICIAL, valor }, false).total).toBe(total);
  });

  it('valor composto só bloqueia quem grava consolidado', () => {
    const campos = { ...INICIAL, valor: '65+70' };

    expect(regrasDoLancamento('SAIDA', campos, false)).toMatchObject({ composto: true, bloqueado: false });
    expect(regrasDoLancamento('SAIDA', campos, true)).toMatchObject({
      bloqueado: true,
      motivoBloqueio: 'O valor composto precisa virar um número só antes de gravar consolidado.',
    });
  });

  it('transferência para a mesma conta bloqueia e esconde os campos de classificação', () => {
    const regras = regrasDoLancamento('TRANSFERENCIA', { ...INICIAL, contaDestino: 'cora' }, false);

    expect(regras).toMatchObject({
      mesmaConta: true,
      semCategoria: false,
      bloqueado: true,
      motivoBloqueio: 'Origem e destino precisam ser contas diferentes.',
      temGrupo: false,
      temCategoria: false,
      temCerimonia: false,
      temContraparte: false,
      temReembolso: false,
    });
  });

  it('competência fechada bloqueia e o motivo dela vem antes dos outros', () => {
    const campos = { ...INICIAL, competencia: '07/2026', contaDestino: 'cora', valor: '65+70' };

    expect(regrasDoLancamento('TRANSFERENCIA', campos, true)).toMatchObject({
      competenciaFechada: true,
      bloqueado: true,
      motivoBloqueio: 'Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.',
    });
  });
});
