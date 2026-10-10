import type { ItemNaFila, LancamentoId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { PainelDeRevisao } from './PainelDeRevisao';
import { campoComRotulo, digitarNaCaixa, rotulosDosCampos, teclarEsc } from '../../apoioDeTeste';

const SAIDA: ItemNaFila = {
  id: 'v-1' as LancamentoId,
  origem: 'COMPROVANTE',
  confianca: 'ALTA',
  tipo: 'SAIDA',
  valor: reais(187.4),
  motivo: 'mercado cerimônia mãe divina',
  data: dataLocal('2026-08-28'),
  grupo: 'Cozinha',
  categoria: 'Alimentação de cerimônia',
  conta: 'Cora PJ',
  contaDestino: null,
  remetente: 'Lucia Prado',
  anexo: 'IMG_2481.jpg',
};

const ENTRADA: ItemNaFila = {
  ...SAIDA,
  id: 'v-5' as LancamentoId,
  origem: 'EXTRATO',
  confianca: 'BAIXA',
  tipo: 'ENTRADA',
  valor: reais(3000),
  motivo: 'PIX recebido — Antônio Vieira',
  data: dataLocal('2026-08-15'),
  grupo: 'Dormitório',
  categoria: 'Doações',
  remetente: null,
  anexo: null,
};

const TRANSFERENCIA: ItemNaFila = {
  ...SAIDA,
  id: 'v-11' as LancamentoId,
  origem: 'EXTRATO',
  confianca: 'ALTA',
  tipo: 'TRANSFERENCIA',
  valor: reais(1500),
  motivo: 'Transferência recebida do Nubank Paty',
  data: dataLocal('2026-08-23'),
  grupo: null,
  categoria: null,
  conta: 'Nubank Paty',
  contaDestino: 'Cora PJ',
  remetente: null,
  anexo: null,
};

afterEach(async () => {
  await desmontarTudo();
});

function montarPainel(item: ItemNaFila, campo = false) {
  const onFechar = vi.fn();
  const onAprovar = vi.fn();
  const onDevolver = vi.fn();
  const montagem = montar(
    <PainelDeRevisao item={item} campo={campo} onFechar={onFechar} onAprovar={onAprovar} onDevolver={onDevolver} />,
  );
  return { montagem, onFechar, onAprovar, onDevolver };
}

const valoresDosCampos = (container: HTMLElement) =>
  todos<HTMLLabelElement>(container, 'label').map((etiqueta) => [
    etiqueta.textContent,
    etiqueta.querySelector('input')?.value,
  ]);

const caixaDoMotivo = (container: HTMLElement) =>
  elemento<HTMLTextAreaElement>(container, 'textarea[aria-label="Motivo da devolução"]');
const botaoDevolverDaCaixa = (container: HTMLElement) => botaoComTexto(container, 'Devolver');
const abrirDevolucao = (container: HTMLElement) => clicar(botaoComTexto(container, 'Devolver'));
const aprovar = (container: HTMLElement) => clicar(botaoComTexto(container, 'Aprovar e consolidar'));
const painel = (container: HTMLElement) =>
  elemento(container, 'button[aria-label="fechar"]').parentElement?.parentElement as HTMLElement;
const cortina = (container: HTMLElement) => painel(container).parentElement as HTMLElement;

describe('PainelDeRevisao: o que mostra do item', () => {
  it.each([
    { confianca: 'ALTA' as const, texto: 'Alta confiança' },
    { confianca: 'MEDIA' as const, texto: 'Média confiança' },
    { confianca: 'BAIXA' as const, texto: 'Baixa confiança' },
  ])('confiança $confianca — o selo do cabeçalho diz $texto', async ({ confianca, texto }) => {
    const { montagem } = montarPainel({ ...SAIDA, confianca });
    const { container } = await montagem;

    expect(container.textContent).toContain('Revisar lançamento');
    expect(container.textContent).toContain(texto);
  });

  it.each([
    { confianca: 'ALTA' as const, texto: 'Alta confiança', tom: 'confirmed' },
    { confianca: 'MEDIA' as const, texto: 'Média confiança', tom: 'suggest' },
    { confianca: 'BAIXA' as const, texto: 'Baixa confiança', tom: 'pending' },
  ])('confiança $confianca — o selo do cabeçalho fica no tom $tom', async ({ confianca, texto, tom }) => {
    const { container } = await montarPainel({ ...SAIDA, confianca }).montagem;

    const selo = folhaComTexto<HTMLSpanElement>(container, 'span', texto);

    expect([selo.style.color, selo.style.background]).toEqual([`var(--color-${tom})`, `var(--color-${tom}-soft)`]);
  });

  it.each([
    { item: SAIDA, linha: 'Foto de comprovante · enviado por Lucia Prado · 28/08/2026' },
    { item: { ...SAIDA, origem: 'REGISTRO_RAPIDO' as const, remetente: 'Chico Aguiar', data: dataLocal('2026-08-19') }, linha: 'Registro rápido · enviado por Chico Aguiar · 19/08/2026' },
    { item: ENTRADA, linha: 'Extrato bancário · importado do banco · 15/08/2026' },
  ])('origem e remetente — a linha de origem é "$linha"', async ({ item, linha }) => {
    const { container } = await montarPainel(item).montagem;

    expect(container.textContent).toContain(linha);
  });

  it('item com anexo — mostra o nome do arquivo; sem anexo, não mostra linha de anexo', async () => {
    const comAnexo = await montarPainel(SAIDA).montagem;
    const nomeDoAnexo = comAnexo.container.textContent?.includes('IMG_2481.jpg');
    await comAnexo.desmontar();
    const semAnexo = await montarPainel(ENTRADA).montagem;

    expect(nomeDoAnexo).toBe(true);
    expect(semAnexo.container.textContent).not.toContain('.jpg');
    expect(semAnexo.container.textContent).not.toContain('.pdf');
  });

  it('saída — os campos são valor, o que foi, data, grupo, categoria e conta, preenchidos com o item', async () => {
    const { container } = await montarPainel(SAIDA).montagem;

    expect(valoresDosCampos(container)).toEqual([
      ['Quanto foi', '187,40'],
      ['O que foi', 'mercado cerimônia mãe divina'],
      ['Data', '28/08/2026'],
      ['Grupo', 'Cozinha'],
      ['Categoria', 'Alimentação de cerimônia'],
      ['Conta', 'Cora PJ'],
    ]);
  });

  it('entrada — o valor e a origem trocam de rótulo e os outros campos são os da saída', async () => {
    const { container } = await montarPainel(ENTRADA).montagem;

    expect(valoresDosCampos(container)).toEqual([
      ['Quanto entrou', '3.000,00'],
      ['De onde veio', 'PIX recebido — Antônio Vieira'],
      ['Data', '15/08/2026'],
      ['Grupo', 'Dormitório'],
      ['Categoria', 'Doações'],
      ['Conta', 'Cora PJ'],
    ]);
  });

  it('transferência — o valor diz Quanto transferiu e há origem e destino no lugar de grupo e categoria (Doc 8 §14, rótulo do valor da transferência)', async () => {
    const { container } = await montarPainel(TRANSFERENCIA).montagem;

    expect(valoresDosCampos(container)).toEqual([
      ['Quanto transferiu', '1.500,00'],
      ['Motivo', 'Transferência recebida do Nubank Paty'],
      ['Data', '23/08/2026'],
      ['Conta de origem', 'Nubank Paty'],
      ['Conta de destino', 'Cora PJ'],
    ]);
  });

  it('item sem grupo e sem categoria — os campos começam vazios', async () => {
    const { container } = await montarPainel({ ...SAIDA, grupo: null, categoria: null }).montagem;

    expect(campoComRotulo(container, 'Grupo').value).toBe('');
    expect(campoComRotulo(container, 'Categoria').value).toBe('');
  });

  it('transferência sem conta de destino — o campo de destino começa vazio', async () => {
    const { container } = await montarPainel({ ...TRANSFERENCIA, contaDestino: null }).montagem;

    expect(campoComRotulo(container, 'Conta de destino').value).toBe('');
  });

  it('a caixa de devolução não aparece antes de pedir', async () => {
    const { container } = await montarPainel(SAIDA).montagem;

    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).not.toContain('Devolver a');
  });
});

describe('PainelDeRevisao: aprovar com ou sem correção', () => {
  it('aprovar sem mexer — entrega o item como veio, uma vez', async () => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledTimes(1);
    expect(onAprovar).toHaveBeenCalledWith(SAIDA);
  });

  it('corrigir o motivo, o grupo, a categoria e a conta — entrega o item com os quatro novos e o resto como veio', async () => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;
    await digitar(campoComRotulo(container, 'O que foi'), 'mercado do trabalho');
    await digitar(campoComRotulo(container, 'Grupo'), 'CDD');
    await digitar(campoComRotulo(container, 'Categoria'), 'Transporte');
    await digitar(campoComRotulo(container, 'Conta'), 'Espécie');

    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith({
      ...SAIDA,
      motivo: 'mercado do trabalho',
      grupo: 'CDD',
      categoria: 'Transporte',
      conta: 'Espécie',
    });
  });

  it('transferência corrigida — origem e destino viram as digitadas', async () => {
    const { montagem, onAprovar } = montarPainel(TRANSFERENCIA);
    const { container } = await montagem;
    await digitar(campoComRotulo(container, 'Conta de origem'), 'Itaú Munay');
    await digitar(campoComRotulo(container, 'Conta de destino'), 'Espécie');

    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith({ ...TRANSFERENCIA, conta: 'Itaú Munay', contaDestino: 'Espécie' });
  });

  it('entrada corrigida — o rótulo De onde veio edita o motivo', async () => {
    const { montagem, onAprovar } = montarPainel(ENTRADA);
    const { container } = await montagem;

    await digitar(campoComRotulo(container, 'De onde veio'), 'doação do padrinho');
    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith({ ...ENTRADA, motivo: 'doação do padrinho' });
  });

  it('grupo apagado — entrega o grupo como texto vazio, não como nulo', async () => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await digitar(campoComRotulo(container, 'Grupo'), '');
    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith({ ...SAIDA, grupo: '' });
  });

  it.each([
    { digitado: '1.250,50', valor: 125050 },
    { digitado: '65', valor: 6500 },
    { digitado: '0,5', valor: 50 },
    { digitado: '1.000', valor: 100000 },
    { digitado: '12.5', valor: 12500 },
    { digitado: '10,999', valor: 1100 },
    { digitado: 'abc', valor: 0 },
    { digitado: '', valor: 0 },
    { digitado: '-5', valor: -500 },
  ])('valor digitado "$digitado" — entrega $valor centavos', async ({ digitado, valor }) => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await digitar(campoComRotulo(container, 'Quanto foi'), digitado);
    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith({ ...SAIDA, valor });
  });

  it('valor digitado — o campo mostra o texto como foi escrito, sem reformatar', async () => {
    const { container } = await montarPainel(SAIDA).montagem;

    await digitar(campoComRotulo(container, 'Quanto foi'), '1250,5');

    expect(campoComRotulo(container, 'Quanto foi').value).toBe('1250,5');
  });

  it('data — aceita digitação mas o valor não muda, e a aprovação leva a data original', async () => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await digitar(campoComRotulo(container, 'Data'), '01/01/2020');
    await aprovar(container);

    expect(campoComRotulo(container, 'Data').value).toBe('28/08/2026');
    expect(onAprovar).toHaveBeenCalledWith(SAIDA);
  });

  it('aprovar duas vezes — entrega duas vezes, sem travar o botão', async () => {
    const { montagem, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await aprovar(container);
    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledTimes(2);
  });
});

describe('PainelDeRevisao: devolver a quem enviou', () => {
  it('pedir devolução — abre a caixa com o nome de quem enviou e esconde o Devolver do rodapé', async () => {
    const { container } = await montarPainel(SAIDA).montagem;

    await abrirDevolucao(container);

    expect(container.textContent).toContain('Devolver a Lucia Prado');
    expect(caixaDoMotivo(container).placeholder).toBe('o motivo chega junto para quem enviou corrigir');
    expect(todos(container, 'button').filter((botao) => botao.textContent === 'Devolver')).toHaveLength(1);
  });

  it('item importado, sem remetente — a caixa diz Devolver a quem enviou', async () => {
    const { container } = await montarPainel(ENTRADA).montagem;

    await abrirDevolucao(container);

    expect(container.textContent).toContain('Devolver a quem enviou');
  });

  it('sem motivo — o botão Devolver fica desligado, com a orientação na tela e no title', async () => {
    const { container } = await montarPainel(SAIDA).montagem;

    await abrirDevolucao(container);

    const devolver = botaoDevolverDaCaixa(container);
    expect(devolver.disabled).toBe(true);
    expect(devolver.title).toBe('Escreva o motivo — é o que a pessoa vai ler.');
    expect(container.textContent).toContain('Escreva o motivo — é o que a pessoa vai ler.');
  });

  it('só espaços no motivo — o botão continua desligado', async () => {
    const { container } = await montarPainel(SAIDA).montagem;
    await abrirDevolucao(container);

    await digitarNaCaixa(caixaDoMotivo(container), '   ');

    expect(botaoDevolverDaCaixa(container).disabled).toBe(true);
  });

  it('com motivo — o botão liga e a orientação some', async () => {
    const { container } = await montarPainel(SAIDA).montagem;
    await abrirDevolucao(container);

    await digitarNaCaixa(caixaDoMotivo(container), 'falta a nota fiscal');

    expect(botaoDevolverDaCaixa(container).disabled).toBe(false);
    expect(container.textContent).not.toContain('Escreva o motivo');
  });

  it('devolver — entrega o motivo sem os espaços das pontas, uma vez, e não chama aprovar', async () => {
    const { montagem, onDevolver, onAprovar } = montarPainel(SAIDA);
    const { container } = await montagem;
    await abrirDevolucao(container);
    await digitarNaCaixa(caixaDoMotivo(container), '  falta a nota fiscal  ');

    await clicar(botaoDevolverDaCaixa(container));

    expect(onDevolver).toHaveBeenCalledTimes(1);
    expect(onDevolver).toHaveBeenCalledWith('falta a nota fiscal');
    expect(onAprovar).not.toHaveBeenCalled();
  });

  it('Cancelar — fecha a caixa e o Devolver do rodapé volta; reabrir mostra o texto que estava escrito', async () => {
    const { container } = await montarPainel(SAIDA).montagem;
    await abrirDevolucao(container);
    await digitarNaCaixa(caixaDoMotivo(container), 'rascunho do motivo');

    await clicar(botaoComTexto(container, 'Cancelar'));
    const aposCancelar = container.querySelector('textarea');
    await abrirDevolucao(container);

    expect(aposCancelar).toBeNull();
    expect(caixaDoMotivo(container).value).toBe('rascunho do motivo');
  });

  it('com a caixa de devolução aberta — Aprovar e consolidar continua disponível e aprova', async () => {
    const { montagem, onAprovar, onDevolver } = montarPainel(SAIDA);
    const { container } = await montagem;
    await abrirDevolucao(container);
    await digitarNaCaixa(caixaDoMotivo(container), 'algum motivo');

    await aprovar(container);

    expect(onAprovar).toHaveBeenCalledWith(SAIDA);
    expect(onDevolver).not.toHaveBeenCalled();
  });
});

describe('PainelDeRevisao: fechar e layout', () => {
  it('o botão × — chama onFechar uma vez', async () => {
    const { montagem, onFechar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await clicar(elemento(container, 'button[aria-label="fechar"]'));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('tocar fora do painel — chama onFechar; tocar dentro dele não chama', async () => {
    const { montagem, onFechar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await clicar(painel(container));
    const aposTocarDentro = onFechar.mock.calls.length;
    await clicar(cortina(container));

    expect(aposTocarDentro).toBe(0);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('o painel não se declara como diálogo e o Esc, teclado dentro dele, não o fecha', async () => {
    const { montagem, onFechar } = montarPainel(SAIDA);
    const { container } = await montagem;

    await teclarEsc(elemento(container, 'button[aria-label="fechar"]'));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('escritório — o painel tem 440px e ocupa a altura toda, colado à direita', async () => {
    const { container } = await montarPainel(SAIDA, false).montagem;

    expect(painel(container).style.width).toBe('440px');
    expect(cortina(container).style.alignItems).toBe('stretch');
  });

  it('campo — o painel ocupa a largura toda, colado embaixo, com até 88% da altura', async () => {
    const { container } = await montarPainel(SAIDA, true).montagem;

    expect(painel(container).style.width).toBe('100%');
    expect(painel(container).style.maxHeight).toBe('88%');
    expect(cortina(container).style.alignItems).toBe('flex-end');
  });

  it('os rótulos dos campos de texto — são os mesmos nas duas densidades', async () => {
    const escritorio = await montarPainel(SAIDA, false).montagem;
    const rotulosNoEscritorio = rotulosDosCampos(escritorio.container);
    await escritorio.desmontar();
    const campo = await montarPainel(SAIDA, true).montagem;

    expect(rotulosDosCampos(campo.container)).toEqual(rotulosNoEscritorio);
  });
});
