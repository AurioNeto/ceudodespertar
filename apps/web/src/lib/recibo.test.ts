import { describe, expect, it } from 'vitest';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import type { LancamentoId, LancamentoNaLista } from '@cdd/contracts';
import { estadoDaLinha, linhasDoRecibo, naturezaDoTipo, rodapeDoRecibo, tomDoRecibo } from './recibo';

const saidaConfirmada: LancamentoNaLista = {
  id: 'l-1' as LancamentoId,
  tipo: 'SAIDA',
  motivo: 'mercado cerimônia mãe divina',
  valor: reais(187.4),
  data: dataLocal('2026-08-28'),
  hora: '14:22',
  competencia: competencia('2026-08'),
  status: 'CONFIRMADO',
  origem: 'MANUAL',
  registradoPor: 'Lucia Prado',
  grupo: 'Cozinha',
  categorias: ['Alimentação de cerimônia'],
  conta: 'Cora PJ',
  contaDestino: null,
  formaPagamento: 'Pix',
  contraparte: 'Assaí Atacadista',
  cerimonia: '05/09 · Mãe Divina',
  eventoId: null,
  comprovante: 'IMG_2481.jpg',
};

const lancamento = (sobrescritas: Partial<LancamentoNaLista> = {}): LancamentoNaLista => ({
  ...saidaConfirmada,
  ...sobrescritas,
});

const transferencia = (sobrescritas: Partial<LancamentoNaLista> = {}): LancamentoNaLista =>
  lancamento({
    tipo: 'TRANSFERENCIA',
    motivo: 'reforço do caixa da cozinha',
    data: dataLocal('2026-09-02'),
    grupo: 'Cozinha',
    categorias: ['Ignorada'],
    conta: 'Cora PJ',
    contaDestino: 'Caixa físico',
    comprovante: 'TED_0902.pdf',
    ...sobrescritas,
  });

const comoPares = (linhas: ReturnType<typeof linhasDoRecibo>) => linhas.map((l) => [l.label, l.value]);

const valorDa = (linhas: ReturnType<typeof linhasDoRecibo>, rotulo: string) =>
  linhas.find((l) => l.label === rotulo)?.value;

const rotulosDe = (linhas: ReturnType<typeof linhasDoRecibo>) => linhas.map((l) => l.label);

describe('tomDoRecibo', () => {
  it.each([
    ['ENTRADA', 'entrada'],
    ['SAIDA', 'saida'],
    ['TRANSFERENCIA', 'transferencia'],
  ] as const)('tipo %s pinta a régua como %s', (tipo, esperado) => {
    expect(tomDoRecibo(tipo)).toBe(esperado);
  });
});

describe('naturezaDoTipo', () => {
  it.each([
    ['ENTRADA', 'receita'],
    ['SAIDA', 'despesa'],
    ['TRANSFERENCIA', 'neutral'],
  ] as const)('tipo %s tem natureza %s', (tipo, esperado) => {
    expect(naturezaDoTipo(tipo)).toBe(esperado);
  });
});

describe('estadoDaLinha', () => {
  it.each([
    ['A_CONFERIR', 'pending'],
    ['CONFIRMADO', 'confirmed'],
    ['ESTORNADO', 'reversed'],
  ] as const)('situação %s vira o estado %s', (status, esperado) => {
    expect(estadoDaLinha(status)).toBe(esperado);
  });
});

describe('linhasDoRecibo de saída', () => {
  it('lista as linhas na ordem do cartão, com a cerimônia', () => {
    expect(comoPares(linhasDoRecibo(lancamento()))).toEqual([
      ['Tipo', 'Saída'],
      ['O que foi', 'mercado cerimônia mãe divina'],
      ['Data', '28/08/2026'],
      ['Grupo', 'Cozinha'],
      ['Categoria', 'Alimentação de cerimônia'],
      ['Conta de saída', 'Cora PJ · Pix'],
      ['Cerimônia', '05/09 · Mãe Divina'],
      ['Comprovante', 'IMG_2481.jpg'],
    ]);
  });

  it('mostrando quem lançou, troca a cerimônia por quem lançou e mantém o resto', () => {
    expect(comoPares(linhasDoRecibo(lancamento(), { mostrarQuemLancou: true }))).toEqual([
      ['Tipo', 'Saída'],
      ['O que foi', 'mercado cerimônia mãe divina'],
      ['Data', '28/08/2026'],
      ['Grupo', 'Cozinha'],
      ['Categoria', 'Alimentação de cerimônia'],
      ['Conta de saída', 'Cora PJ · Pix'],
      ['Quem lançou', 'Lucia Prado'],
      ['Comprovante', 'IMG_2481.jpg'],
    ]);
  });

  it('opções vazias valem como não mostrar quem lançou', () => {
    expect(rotulosDe(linhasDoRecibo(lancamento(), {}))).toContain('Cerimônia');
  });

  it('mostrar quem lançou como falso mantém a cerimônia', () => {
    const linhas = linhasDoRecibo(lancamento(), { mostrarQuemLancou: false });
    expect(rotulosDe(linhas)).toContain('Cerimônia');
    expect(rotulosDe(linhas)).not.toContain('Quem lançou');
  });

  it('sem grupo mostra o traço', () => {
    expect(valorDa(linhasDoRecibo(lancamento({ grupo: null })), 'Grupo')).toBe('—');
  });

  it('várias categorias saem separadas por vírgula', () => {
    const linhas = linhasDoRecibo(lancamento({ categorias: ['Alimentação', 'Limpeza', 'Manutenção'] }));
    expect(valorDa(linhas, 'Categoria')).toBe('Alimentação, Limpeza, Manutenção');
  });

  it('sem categoria diz não classificado', () => {
    expect(valorDa(linhasDoRecibo(lancamento({ categorias: [] })), 'Categoria')).toBe('não classificado');
  });

  it('sem cerimônia diz que foi gasto da casa', () => {
    expect(valorDa(linhasDoRecibo(lancamento({ cerimonia: null })), 'Cerimônia')).toBe(
      'Nenhuma — gasto da casa',
    );
  });

  it('sem comprovante diz sem anexo', () => {
    expect(valorDa(linhasDoRecibo(lancamento({ comprovante: null })), 'Comprovante')).toBe('sem anexo');
  });

  it('a forma de pagamento acompanha a conta', () => {
    const linhas = linhasDoRecibo(lancamento({ conta: 'Caixa físico', formaPagamento: 'Dinheiro' }));
    expect(valorDa(linhas, 'Conta de saída')).toBe('Caixa físico · Dinheiro');
  });

  it('a data sai como dia/mês/ano a partir da data do lançamento', () => {
    expect(valorDa(linhasDoRecibo(lancamento({ data: dataLocal('2027-01-05') })), 'Data')).toBe('05/01/2027');
  });

  it('o estorno não muda as linhas da saída', () => {
    const confirmada = comoPares(linhasDoRecibo(lancamento({ status: 'CONFIRMADO' })));
    expect(comoPares(linhasDoRecibo(lancamento({ status: 'ESTORNADO' })))).toEqual(confirmada);
  });
});

describe('linhasDoRecibo de entrada', () => {
  const entrada = (sobrescritas: Partial<LancamentoNaLista> = {}) =>
    lancamento({
      tipo: 'ENTRADA',
      motivo: 'doação de mantenedor',
      conta: 'Cora PJ',
      formaPagamento: 'Boleto',
      ...sobrescritas,
    });

  it('usa os rótulos de entrada para origem e conta', () => {
    expect(comoPares(linhasDoRecibo(entrada()))).toEqual([
      ['Tipo', 'Entrada'],
      ['De onde veio', 'doação de mantenedor'],
      ['Data', '28/08/2026'],
      ['Grupo', 'Cozinha'],
      ['Categoria', 'Alimentação de cerimônia'],
      ['Conta de entrada', 'Cora PJ · Boleto'],
      ['Cerimônia', '05/09 · Mãe Divina'],
      ['Comprovante', 'IMG_2481.jpg'],
    ]);
  });

  it('mostrando quem lançou, troca a cerimônia por quem lançou', () => {
    const linhas = linhasDoRecibo(entrada(), { mostrarQuemLancou: true });
    expect(rotulosDe(linhas)).toEqual([
      'Tipo',
      'De onde veio',
      'Data',
      'Grupo',
      'Categoria',
      'Conta de entrada',
      'Quem lançou',
      'Comprovante',
    ]);
    expect(valorDa(linhas, 'Quem lançou')).toBe('Lucia Prado');
  });
});

describe('linhasDoRecibo de transferência', () => {
  it('troca grupo e categoria por saiu de e entrou em, e mostra o comprovante', () => {
    expect(comoPares(linhasDoRecibo(transferencia()))).toEqual([
      ['Tipo', 'Transferência entre contas'],
      ['Motivo', 'reforço do caixa da cozinha'],
      ['Data', '02/09/2026'],
      ['Saiu de', 'Cora PJ'],
      ['Entrou em', 'Caixa físico'],
      ['Comprovante', 'TED_0902.pdf'],
    ]);
  });

  it('mostrando quem lançou, troca o comprovante por quem lançou e situação', () => {
    expect(comoPares(linhasDoRecibo(transferencia({ status: 'A_CONFERIR' }), { mostrarQuemLancou: true }))).toEqual([
      ['Tipo', 'Transferência entre contas'],
      ['Motivo', 'reforço do caixa da cozinha'],
      ['Data', '02/09/2026'],
      ['Saiu de', 'Cora PJ'],
      ['Entrou em', 'Caixa físico'],
      ['Quem lançou', 'Lucia Prado'],
      ['Situação', 'A conferir'],
    ]);
  });

  it.each([
    ['A_CONFERIR', 'A conferir'],
    ['CONFIRMADO', 'Consolidado'],
    ['ESTORNADO', 'Estornado'],
  ] as const)('situação %s aparece como %s', (status, rotulo) => {
    const linhas = linhasDoRecibo(transferencia({ status }), { mostrarQuemLancou: true });
    expect(valorDa(linhas, 'Situação')).toBe(rotulo);
  });

  it('sem conta de destino mostra o traço', () => {
    expect(valorDa(linhasDoRecibo(transferencia({ contaDestino: null })), 'Entrou em')).toBe('—');
  });

  it('sem comprovante diz sem anexo', () => {
    expect(valorDa(linhasDoRecibo(transferencia({ comprovante: null })), 'Comprovante')).toBe('sem anexo');
  });

  it('não mostra grupo, categoria nem cerimônia', () => {
    const rotulos = rotulosDe(linhasDoRecibo(transferencia()));
    expect(rotulos).not.toContain('Grupo');
    expect(rotulos).not.toContain('Categoria');
    expect(rotulos).not.toContain('Cerimônia');
  });

  it('ignora a forma de pagamento', () => {
    const linhas = linhasDoRecibo(transferencia({ formaPagamento: 'Pix' }));
    expect(JSON.stringify(comoPares(linhas))).not.toContain('Pix');
  });

  it('mostrando quem lançou não mostra o comprovante', () => {
    const linhas = linhasDoRecibo(transferencia(), { mostrarQuemLancou: true });
    expect(rotulosDe(linhas)).not.toContain('Comprovante');
  });
});

describe('rodapeDoRecibo', () => {
  it('lançamento estornado explica que fica no histórico', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'ESTORNADO' }))).toBe(
      'Estornado — o lançamento fica no histórico com a marca de estorno.',
    );
  });

  it('lançamento a conferir diz quem lançou e que falta a tesouraria', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'A_CONFERIR', registradoPor: 'Lucia Prado' }))).toBe(
      'A conferir: lançado por Lucia Prado, ainda sem consolidação da tesouraria.',
    );
  });

  it('lançamento confirmado diz que foi consolidado por Aurio Neto quando ninguém é informado', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'CONFIRMADO' }))).toBe(
      'Consolidado por Aurio Neto. Alteração só por estorno, com motivo registrado.',
    );
  });

  it('lançamento confirmado usa o nome de quem consolidou', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'CONFIRMADO' }), 'Marta Lopes')).toBe(
      'Consolidado por Marta Lopes. Alteração só por estorno, com motivo registrado.',
    );
  });

  it('lançamento estornado ignora quem consolidou', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'ESTORNADO' }), 'Marta Lopes')).not.toContain('Marta Lopes');
  });

  it('lançamento a conferir ignora quem consolidou', () => {
    expect(rodapeDoRecibo(lancamento({ status: 'A_CONFERIR' }), 'Marta Lopes')).not.toContain('Marta Lopes');
  });

  it('o tipo do lançamento não muda o rodapé', () => {
    expect(rodapeDoRecibo(transferencia({ status: 'CONFIRMADO' }))).toBe(
      rodapeDoRecibo(lancamento({ status: 'CONFIRMADO' })),
    );
  });
});
