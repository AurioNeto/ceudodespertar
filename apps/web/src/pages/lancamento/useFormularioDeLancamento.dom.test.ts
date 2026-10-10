import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { desmontarTudo, montar } from '@/testes/montagem';
import { useFormularioDeLancamento } from './useFormularioDeLancamento';

type Formulario = ReturnType<typeof useFormularioDeLancamento>;

const HORA_FIXA = new Date('2026-09-02T15:07:00Z');

const CAMPOS_INICIAIS = {
  valor: '',
  descricao: '',
  data: '28/08/2026',
  contraparte: '',
  competencia: '08/2026',
  conta: 'cora',
  contaDestino: 'nubank',
  categorias: [],
  grupo: 'Chácara (Infraestrutura)',
  unidade: 'CDD',
  pagamento: 'Pix',
  cerimonia: 'Nenhuma — gasto da casa',
  anexo: null,
  reembolso: false,
  pessoa: 'Lucia Prado',
};

async function montarFormulario(consolida = false) {
  const leitura: { atual: Formulario | null } = { atual: null };
  const Sonda = ({ consolida: consolidaAgora }: { consolida: boolean }) => {
    leitura.atual = useFormularioDeLancamento(consolidaAgora);
    return null;
  };
  const montado = await montar(createElement(Sonda, { consolida }));
  const formulario = () => leitura.atual as Formulario;
  const agir = (acao: (f: Formulario) => void) =>
    act(async () => {
      acao(formulario());
    });
  const mudarPermissao = (nova: boolean) => montado.atualizar(createElement(Sonda, { consolida: nova }));
  return { formulario, agir, mudarPermissao };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HORA_FIXA);
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
});

describe('useFormularioDeLancamento: estado de entrada', () => {
  it('ao montar — o tipo é saída, os campos são os padrões e nada está aberto nem registrado', async () => {
    const { formulario } = await montarFormulario();

    const f = formulario();
    expect(f.tipo).toBe('SAIDA');
    expect(f.campos).toEqual(CAMPOS_INICIAIS);
    expect(f.picker).toBeNull();
    expect(f.recibo).toBeNull();
    expect(f.sugestoesPendentes).toEqual([]);
  });

  it('ao montar — o total é zero e a nota do tipo é a de saída', async () => {
    const { formulario } = await montarFormulario();

    expect(formulario().total).toBe(0);
    expect(formulario().notaTipo).toBe('Dinheiro que saiu para fora da casa.');
  });
});

describe('useFormularioDeLancamento: leitura do valor digitado', () => {
  it.each([
    { valor: '', total: 0 },
    { valor: '65', total: 65 },
    { valor: '12,50', total: 12.5 },
    { valor: '1.200', total: 1200 },
    { valor: '1.200,50', total: 1200.5 },
    { valor: '65+70', total: 135 },
    { valor: '1.200+50', total: 1250 },
    { valor: '40+25,50', total: 65.5 },
    { valor: ' 40 + 25,50 ', total: 65.5 },
    { valor: '10+abc+5', total: 15 },
    { valor: '10+', total: 10 },
    { valor: '+10', total: 10 },
    { valor: 'abc', total: 0 },
    { valor: 'R$ 40', total: 0 },
    { valor: '1.5', total: 15 },
    { valor: '10,5,3', total: 10.5 },
    { valor: '-50', total: -50 },
    { valor: '1e3', total: 1000 },
  ])('valor "$valor" — o total lido é $total', async ({ valor, total }) => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('valor', valor));

    expect(formulario().total).toBe(total);
  });

  it.each([
    { valor: '65', composto: false },
    { valor: '65+70', composto: true },
    { valor: '+', composto: true },
    { valor: '', composto: false },
  ])('valor "$valor" — composto é $composto', async ({ valor, composto }) => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('valor', valor));

    expect(formulario().composto).toBe(composto);
  });
});

describe('useFormularioDeLancamento: o que cada tipo mostra e como se chama', () => {
  it.each([
    {
      tipo: 'SAIDA' as const,
      esperado: {
        ehSaida: true,
        ehEntrada: false,
        ehTransferencia: false,
        temGrupo: true,
        temCategoria: true,
        temCerimonia: true,
        temContraparte: true,
        temReembolso: true,
        labelValor: 'Quanto foi',
        labelDescricao: 'O que foi',
        placeholderDescricao: 'mercado cerimônia mãe divina',
        labelData: 'Data do gasto',
        labelContraparte: 'Fornecedor',
        placeholderContraparte: 'quem recebeu o dinheiro',
        labelConta: 'Conta de saída',
        labelPagamento: 'Forma de pagamento',
        notaGrupo: 'Onde o gasto aconteceu. Um por lançamento.',
        notaConta: 'mais usada por você',
        notaTipo: 'Dinheiro que saiu para fora da casa.',
      },
    },
    {
      tipo: 'ENTRADA' as const,
      esperado: {
        ehSaida: false,
        ehEntrada: true,
        ehTransferencia: false,
        temGrupo: true,
        temCategoria: true,
        temCerimonia: true,
        temContraparte: true,
        temReembolso: false,
        labelValor: 'Quanto entrou',
        labelDescricao: 'De onde veio',
        placeholderDescricao: 'contribuições da cerimônia de agosto',
        labelData: 'Data da entrada',
        labelContraparte: 'De quem veio',
        placeholderContraparte: 'quem entregou o dinheiro',
        labelConta: 'Conta de entrada',
        labelPagamento: 'Forma de recebimento',
        notaGrupo: 'De onde veio a entrada. Um por lançamento.',
        notaConta: 'mais usada por você',
        notaTipo: 'Dinheiro que entrou: doação, venda da lojinha, contribuição de cerimônia.',
      },
    },
    {
      tipo: 'TRANSFERENCIA' as const,
      esperado: {
        ehSaida: false,
        ehEntrada: false,
        ehTransferencia: true,
        temGrupo: false,
        temCategoria: false,
        temCerimonia: false,
        temContraparte: false,
        temReembolso: false,
        labelValor: 'Quanto transferir',
        labelDescricao: 'Motivo da transferência',
        placeholderDescricao: 'repasse do caixa da lojinha para o Cora',
        labelData: 'Data da transferência',
        labelContraparte: 'Fornecedor',
        placeholderContraparte: 'quem recebeu o dinheiro',
        labelConta: 'Conta de origem',
        labelPagamento: 'Forma da transferência',
        notaGrupo: 'Onde o gasto aconteceu. Um por lançamento.',
        notaConta: 'De onde o dinheiro sai.',
        notaTipo:
          'Dinheiro que sai de uma conta da casa e entra em outra. Não é despesa nem receita: o total não muda, só o lugar onde o dinheiro está.',
      },
    },
  ])('tipo $tipo — os rótulos, as notas e o que aparece são os do tipo', async ({ tipo, esperado }) => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.trocarTipo(tipo));

    expect(formulario()).toMatchObject(esperado);
  });

  it('contas — o rótulo da conta e da conta de destino vêm do nome da opção, e a meta do destino vem da lista de contas', async () => {
    const { formulario } = await montarFormulario();

    expect(formulario()).toMatchObject({
      conta: 'Cora PJ',
      contaDestino: 'Nubank Paty',
      notaContaDestino: 'conta pessoal',
    });
  });

  it('conta de destino igual à de origem — a nota pede uma conta diferente', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    await agir((f) => f.alterar('contaDestino', 'cora'));

    expect(formulario()).toMatchObject({ mesmaConta: true, notaContaDestino: 'Escolha uma conta diferente da origem.' });
  });

  it('mesma conta fora de transferência — não conta como mesma conta', async () => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('contaDestino', 'cora'));

    expect(formulario().mesmaConta).toBe(false);
  });

  it.each([
    { competencia: '08/2026', fechada: false, nota: 'Mês corrente.' },
    { competencia: '09/2026', fechada: false, nota: 'Mês corrente.' },
    { competencia: '07/2026', fechada: true, nota: 'Veio da data do gasto — julho está fechado.' },
  ])('competência $competencia — fechada é $fechada e a nota é "$nota"', async ({ competencia, fechada, nota }) => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('competencia', competencia));

    expect(formulario()).toMatchObject({ competenciaFechada: fechada, notaCompetencia: nota });
  });
});

describe('useFormularioDeLancamento: bloqueio e nota da barra', () => {
  const PERIODO_FECHADO = 'Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.';
  const MESMA_CONTA = 'Origem e destino precisam ser contas diferentes.';
  const COMPOSTO = 'O valor composto precisa virar um número só antes de gravar consolidado.';
  const NOTA_DE_BLOQUEIO = 'Enquanto isso não se resolve, dá para salvar como rascunho — nada se perde.';

  it.each([
    { nome: 'período fechado', consolida: false, competencia: '07/2026', valor: '', motivo: PERIODO_FECHADO },
    { nome: 'período fechado e composto consolidado', consolida: true, competencia: '07/2026', valor: '1+2', motivo: PERIODO_FECHADO },
    { nome: 'composto consolidado', consolida: true, competencia: '08/2026', valor: '1+2', motivo: COMPOSTO },
    { nome: 'composto sem consolidar', consolida: false, competencia: '08/2026', valor: '1+2', motivo: undefined },
    { nome: 'nada de especial', consolida: true, competencia: '08/2026', valor: '3', motivo: undefined },
  ])('saída, $nome — o motivo do bloqueio é $motivo', async ({ consolida, competencia, valor, motivo }) => {
    const { formulario, agir } = await montarFormulario(consolida);

    await agir((f) => {
      f.alterar('competencia', competencia);
      f.alterar('valor', valor);
    });

    expect(formulario().motivoBloqueio).toBe(motivo);
    expect(formulario().bloqueado).toBe(motivo !== undefined);
  });

  it('transferência de uma conta para ela mesma — o motivo é o das contas, e o período fechado vem antes', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));
    await agir((f) => f.alterar('contaDestino', 'cora'));
    const soMesmaConta = formulario().motivoBloqueio;

    await agir((f) => f.alterar('competencia', '07/2026'));

    expect(soMesmaConta).toBe(MESMA_CONTA);
    expect(formulario().motivoBloqueio).toBe(PERIODO_FECHADO);
  });

  it('transferência consolidada com mesma conta e composto — o motivo é o das contas, que vem antes do composto', async () => {
    const { formulario, agir } = await montarFormulario(true);
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    await agir((f) => {
      f.alterar('contaDestino', 'cora');
      f.alterar('valor', '1+2');
    });

    expect(formulario().motivoBloqueio).toBe(MESMA_CONTA);
  });

  it('transferência consolidada com composto — o composto bloqueia como nas outras', async () => {
    const { formulario, agir } = await montarFormulario(true);
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    await agir((f) => f.alterar('valor', '1+2'));

    expect(formulario().motivoBloqueio).toBe(COMPOSTO);
  });

  it('permissão que muda — a mesma soma passa a bloquear quando o usuário ganha a permissão de consolidar', async () => {
    const { formulario, agir, mudarPermissao } = await montarFormulario(false);
    await agir((f) => f.alterar('valor', '1+2'));
    const antes = formulario().bloqueado;

    await mudarPermissao(true);

    expect(antes).toBe(false);
    expect(formulario().bloqueado).toBe(true);
  });

  it.each([
    {
      nome: 'bloqueado por período fechado',
      consolida: false,
      competencia: '07/2026',
      tipo: 'SAIDA' as const,
      valor: '',
      categorias: [],
      nota: NOTA_DE_BLOQUEIO,
    },
    {
      nome: 'transferência liberada',
      consolida: false,
      competencia: '08/2026',
      tipo: 'TRANSFERENCIA' as const,
      valor: '',
      categorias: [],
      nota: 'Grava os dois lados de uma vez: saída em Cora PJ e entrada em Nubank Paty.',
    },
    {
      nome: 'transferência com soma sem consolidar',
      consolida: false,
      competencia: '08/2026',
      tipo: 'TRANSFERENCIA' as const,
      valor: '1+2',
      categorias: [],
      nota: 'Grava os dois lados de uma vez: saída em Cora PJ e entrada em Nubank Paty.',
    },
    {
      nome: 'soma sem consolidar, com categoria',
      consolida: false,
      competencia: '08/2026',
      tipo: 'SAIDA' as const,
      valor: '1+2',
      categorias: ['Transporte'],
      nota: 'Grava como a conferir: o valor composto vira pendência na conferência.',
    },
    {
      nome: 'soma sem consolidar, sem categoria',
      consolida: false,
      competencia: '08/2026',
      tipo: 'SAIDA' as const,
      valor: '1+2',
      categorias: [],
      nota: 'Grava como a conferir: o valor composto vira pendência na conferência.',
    },
    {
      nome: 'sem categoria',
      consolida: true,
      competencia: '08/2026',
      tipo: 'SAIDA' as const,
      valor: '3',
      categorias: [],
      nota: 'Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.',
    },
    {
      nome: 'entrada sem categoria',
      consolida: false,
      competencia: '08/2026',
      tipo: 'ENTRADA' as const,
      valor: '3',
      categorias: [],
      nota: 'Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.',
    },
    {
      nome: 'com categoria, consolidando',
      consolida: true,
      competencia: '08/2026',
      tipo: 'SAIDA' as const,
      valor: '3',
      categorias: ['Transporte'],
      nota: 'Consolidado é definitivo: depois de gravado, só estorno.',
    },
    {
      nome: 'com categoria, sem consolidar',
      consolida: false,
      competencia: '08/2026',
      tipo: 'SAIDA' as const,
      valor: '3',
      categorias: ['Transporte'],
      nota: 'Grava como a conferir: a tesouraria confere antes de consolidar.',
    },
  ])('$nome — a nota da barra é "$nota"', async ({ consolida, competencia, tipo, valor, categorias, nota }) => {
    const { formulario, agir } = await montarFormulario(consolida);

    await agir((f) => {
      f.trocarTipo(tipo);
      f.alterar('competencia', competencia);
      f.alterar('valor', valor);
      categorias.forEach((categoria) => f.alternarCategoria(categoria));
    });

    expect(formulario().notaBarra).toBe(nota);
  });

  it('transferência liberada para outras contas — a nota cita os nomes das duas contas escolhidas', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    await agir((f) => {
      f.alterar('conta', 'especie');
      f.alterar('contaDestino', 'itau');
    });

    expect(formulario().notaBarra).toBe('Grava os dois lados de uma vez: saída em Espécie e entrada em Itaú Munay.');
  });

  it('semCategoria — vale para saída e entrada sem categoria e nunca para transferência', async () => {
    const { formulario, agir } = await montarFormulario();
    const naSaida = formulario().semCategoria;
    await agir((f) => f.trocarTipo('ENTRADA'));
    const naEntrada = formulario().semCategoria;

    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    expect(naSaida).toBe(true);
    expect(naEntrada).toBe(true);
    expect(formulario().semCategoria).toBe(false);
  });
});

describe('useFormularioDeLancamento: troca de tipo', () => {
  it('saída para entrada — desliga o reembolso e põe a forma em Pix, e mantém o resto', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('reembolso', true);
      f.alterar('pagamento', 'Boleto');
      f.alterar('cerimonia', '05/09 · Mãe Divina');
      f.alterar('descricao', 'x');
    });

    await agir((f) => f.trocarTipo('ENTRADA'));

    expect(formulario().campos).toEqual({
      ...CAMPOS_INICIAIS,
      reembolso: false,
      pagamento: 'Pix',
      cerimonia: '05/09 · Mãe Divina',
      descricao: 'x',
    });
  });

  it('entrada para saída — não mexe em nenhum campo', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.trocarTipo('ENTRADA'));
    await agir((f) => f.alterar('pagamento', 'Boleto'));
    const antes = formulario().campos;

    await agir((f) => f.trocarTipo('SAIDA'));

    expect(formulario().campos).toEqual(antes);
  });

  it('para transferência — zera reembolso e cerimônia e põe a forma em Pix', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('reembolso', true);
      f.alterar('pagamento', 'Boleto');
      f.alterar('cerimonia', '05/09 · Mãe Divina');
    });

    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    expect(formulario().campos).toMatchObject({
      reembolso: false,
      pagamento: 'Pix',
      cerimonia: 'Nenhuma — gasto da casa',
    });
  });

  it.each([
    { conta: 'cora', destino: 'cora', destinoDepois: 'nubank' },
    { conta: 'nubank', destino: 'nubank', destinoDepois: 'cora' },
    { conta: 'especie', destino: 'especie', destinoDepois: 'cora' },
    { conta: 'cora', destino: 'itau', destinoDepois: 'itau' },
  ])('para transferência com conta $conta e destino $destino — o destino fica $destinoDepois', async ({ conta, destino, destinoDepois }) => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('conta', conta);
      f.alterar('contaDestino', destino);
    });

    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    expect(formulario().campos.contaDestino).toBe(destinoDepois);
  });

  it('trocar o tipo — fecha a folha aberta', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.abrirPicker('grupo'));

    await agir((f) => f.trocarTipo('ENTRADA'));

    expect(formulario().picker).toBeNull();
  });

  it('para transferência — as categorias já escolhidas ficam guardadas para a volta', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alternarCategoria('Transporte'));

    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    expect(formulario().campos.categorias).toEqual(['Transporte']);
  });
});

describe('useFormularioDeLancamento: categorias, folhas e campos', () => {
  it('alternar categoria — adiciona na ordem e remove quando já está', async () => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alternarCategoria('Transporte'));
    await agir((f) => f.alternarCategoria('Manutenção'));
    const duas = formulario().campos.categorias;
    await agir((f) => f.alternarCategoria('Transporte'));

    expect(duas).toEqual(['Transporte', 'Manutenção']);
    expect(formulario().campos.categorias).toEqual(['Manutenção']);
  });

  it('abrir e fechar folha — guarda o campo aberto e volta a nenhum', async () => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.abrirPicker('competencia'));
    const aberto = formulario().picker;
    await agir((f) => f.fecharPicker());

    expect(aberto).toBe('competencia');
    expect(formulario().picker).toBeNull();
  });

  it('alterar — troca só o campo pedido', async () => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('descricao', 'diarista'));

    expect(formulario().campos).toEqual({ ...CAMPOS_INICIAIS, descricao: 'diarista' });
  });
});

describe('useFormularioDeLancamento: sugestões do cupom', () => {
  it('sem anexo — nenhuma sugestão pendente, mesmo sem nada resolvido', async () => {
    const { formulario } = await montarFormulario();

    expect(formulario().sugestoesPendentes).toEqual([]);
  });

  it('com anexo — as quatro sugestões vêm em ordem, com a categoria em minúsculas no texto', async () => {
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    expect(formulario().sugestoesPendentes).toEqual([
      { chave: 'valor', texto: 'Valor 187,40' },
      { chave: 'descricao', texto: 'Descrição: mercado cerimônia mãe divina' },
      { chave: 'contraparte', texto: 'Fornecedor: Assaí Atacadista' },
      { chave: 'categoria', texto: 'Categoria: alimentação de cerimônia' },
    ]);
  });

  it.each([
    { chave: 'valor' as const, campo: 'valor', esperado: '187,40' },
    { chave: 'descricao' as const, campo: 'descricao', esperado: 'mercado cerimônia mãe divina' },
    { chave: 'contraparte' as const, campo: 'contraparte', esperado: 'Assaí Atacadista' },
  ])('aceitar a sugestão de $chave — grava no campo e tira das pendentes', async ({ chave, campo, esperado }) => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    await agir((f) => f.aceitarSugestao(chave));

    expect(formulario().campos).toMatchObject({ [campo]: esperado });
    expect(formulario().sugestoesPendentes.map((s) => s.chave)).not.toContain(chave);
  });

  it('aceitar a sugestão de categoria sem ela escolhida — marca a categoria sugerida', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    await agir((f) => f.aceitarSugestao('categoria'));

    expect(formulario().campos.categorias).toEqual(['Alimentação de cerimônia']);
  });

  it('aceitar a sugestão de categoria com ela já escolhida — desmarca a categoria, em vez de mantê-la', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.alternarCategoria('Alimentação de cerimônia');
    });

    await agir((f) => f.aceitarSugestao('categoria'));

    expect(formulario().campos.categorias).toEqual([]);
    expect(formulario().sugestoesPendentes.map((s) => s.chave)).not.toContain('categoria');
  });

  it('descartar — tira das pendentes sem tocar nos campos', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    await agir((f) => f.descartarSugestao('valor'));

    expect(formulario().campos).toEqual({ ...CAMPOS_INICIAIS, anexo: 'IMG.jpg' });
    expect(formulario().sugestoesPendentes.map((s) => s.chave)).toEqual(['descricao', 'contraparte', 'categoria']);
  });

  it('aceitar todas — grava as quatro, sem repetir a categoria que já estava, e esvazia as pendentes', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.alternarCategoria('Alimentação de cerimônia');
    });

    await agir((f) => f.aceitarTodas());

    expect(formulario().campos).toMatchObject({
      valor: '187,40',
      descricao: 'mercado cerimônia mãe divina',
      contraparte: 'Assaí Atacadista',
      categorias: ['Alimentação de cerimônia'],
    });
    expect(formulario().sugestoesPendentes).toEqual([]);
  });

  it('aceitar todas com outra categoria já escolhida — acrescenta a sugerida depois dela', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.alternarCategoria('Transporte');
    });

    await agir((f) => f.aceitarTodas());

    expect(formulario().campos.categorias).toEqual(['Transporte', 'Alimentação de cerimônia']);
  });

  it('aceitar todas — sobrescreve o valor, a descrição e o fornecedor já escritos', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.alterar('valor', '10');
      f.alterar('descricao', 'meu texto');
      f.alterar('contraparte', 'outro');
    });

    await agir((f) => f.aceitarTodas());

    expect(formulario().campos).toMatchObject({ valor: '187,40', descricao: 'mercado cerimônia mãe divina', contraparte: 'Assaí Atacadista' });
  });
});

describe('useFormularioDeLancamento: registrar, limpar e descartar o recibo', () => {
  it('registrar saída — o recibo guarda o total numérico, o tipo e a hora do relógio', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alterar('valor', '65+70'));

    await agir((f) => f.registrar());

    expect(formulario().recibo).toMatchObject({ total: 135, tipo: 'SAIDA', horario: '15:07' });
  });

  it('registrar — volta os campos aos padrões e fecha a folha, mas mantém o tipo', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.trocarTipo('ENTRADA');
      f.alterar('valor', '10');
      f.alterar('anexo', 'IMG.jpg');
      f.abrirPicker('conta');
    });

    await agir((f) => f.registrar());

    expect(formulario().campos).toEqual(CAMPOS_INICIAIS);
    expect(formulario().picker).toBeNull();
    expect(formulario().tipo).toBe('ENTRADA');
  });

  it('registrar depois de descartar uma sugestão — anexar de novo traz as quatro sugestões', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.descartarSugestao('valor');
    });

    await agir((f) => f.registrar());
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    expect(formulario().sugestoesPendentes.map((s) => s.chave)).toEqual(['valor', 'descricao', 'contraparte', 'categoria']);
  });

  it('registrar sem anexo e com anexo — o comprovante entra no recibo da saída só quando existe', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.registrar());
    const semAnexo = formulario().recibo?.linhas.map((l) => l.label);
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    await agir((f) => f.registrar());

    expect(semAnexo).not.toContain('Comprovante');
    expect(formulario().recibo?.linhas.at(-1)).toEqual({ label: 'Comprovante', value: 'IMG.jpg' });
  });

  it('registrar entrada — não leva o comprovante nem a categoria no recibo, mesmo com anexo e categorias', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.trocarTipo('ENTRADA');
      f.alterar('anexo', 'IMG.jpg');
      f.alternarCategoria('Transporte');
    });

    await agir((f) => f.registrar());

    expect(formulario().recibo?.linhas.map((l) => l.label)).toEqual([
      'Tipo',
      'De onde veio',
      'Data',
      'Grupo',
      'Conta de entrada',
      'Cerimônia',
    ]);
  });

  it('registrar transferência — o recibo nomeia as duas contas e o motivo cai em traço quando vazio', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.trocarTipo('TRANSFERENCIA'));

    await agir((f) => f.registrar());

    expect(formulario().recibo?.linhas).toEqual([
      { label: 'Tipo', value: 'Transferência entre contas' },
      { label: 'Motivo', value: '—' },
      { label: 'Data', value: '28/08/2026' },
      { label: 'Saiu de', value: 'Cora PJ' },
      { label: 'Entrou em', value: 'Nubank Paty' },
    ]);
  });

  it('registrar com a competência fechada — o hook registra sem conferir o bloqueio, e a competência volta a 08/2026', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.alterar('competencia', '07/2026'));
    const bloqueadoAntes = formulario().bloqueado;

    await agir((f) => f.registrar());

    expect(bloqueadoAntes).toBe(true);
    expect(formulario().recibo).not.toBeNull();
    expect(formulario().campos.competencia).toBe('08/2026');
  });

  it('registrar com a hora no fim do dia — a hora do recibo segue o relógio no fuso do teste', async () => {
    vi.setSystemTime(new Date('2026-09-02T23:59:00Z'));
    const { formulario, agir } = await montarFormulario();

    await agir((f) => f.registrar());

    expect(formulario().recibo?.horario).toBe('23:59');
  });

  it('limpar — esvazia campos, folha e recibo, e mantém o tipo', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.trocarTipo('TRANSFERENCIA');
      f.alterar('valor', '10');
      f.abrirPicker('conta');
    });
    await agir((f) => f.registrar());
    await agir((f) => f.abrirPicker('conta'));

    await agir((f) => f.limpar());

    expect(formulario().campos).toEqual(CAMPOS_INICIAIS);
    expect(formulario().picker).toBeNull();
    expect(formulario().recibo).toBeNull();
    expect(formulario().tipo).toBe('TRANSFERENCIA');
  });

  it('limpar depois de descartar uma sugestão — anexar de novo traz as quatro sugestões', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => {
      f.alterar('anexo', 'IMG.jpg');
      f.descartarSugestao('valor');
    });

    await agir((f) => f.limpar());
    await agir((f) => f.alterar('anexo', 'IMG.jpg'));

    expect(formulario().sugestoesPendentes.map((s) => s.chave)).toEqual(['valor', 'descricao', 'contraparte', 'categoria']);
  });

  it('descartar o recibo — tira só o recibo e deixa os campos como estão', async () => {
    const { formulario, agir } = await montarFormulario();
    await agir((f) => f.registrar());
    await agir((f) => f.alterar('descricao', 'novo'));

    await agir((f) => f.descartarRecibo());

    expect(formulario().recibo).toBeNull();
    expect(formulario().campos.descricao).toBe('novo');
  });
});
