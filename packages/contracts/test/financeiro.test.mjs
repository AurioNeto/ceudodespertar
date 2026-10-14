import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CadastrarPessoa,
  ConfirmarLancamento,
  CriarCategoria,
  CriarConta,
  CriarUnidade,
  MAXIMO_DE_DINHEIRO_EM_CENTAVOS,
  EditarUnidade,
  ParametrosDoPeriodo,
  ReabrirPeriodo,
  RegistrarLancamento,
  RegistrarTransferencia,
} from '../dist/index.js';

const UUID_A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_B = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const UUID_C = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function regras(resultado) {
  assert.equal(resultado.success, false);
  return resultado.error.issues.map((problema) => ({ caminho: problema.path.join('.'), regra: problema.params?.regra ?? problema.code }));
}

const lancamentoMinimo = { natureza: 'DESPESA', valor: 2000, motivo: 'Encontro de contas com a Aline' };

test('lançamento mínimo de registro rápido: só natureza, valor e motivo, com o resto nulo e sem etiquetas', () => {
  const lancamento = RegistrarLancamento.parse(lancamentoMinimo);

  assert.deepEqual(lancamento.etiquetas, []);
  assert.equal(lancamento.contaId, null);
  assert.equal(lancamento.dataCompetencia, null);
  assert.equal(lancamento.pessoaId, null);
});

test('dinheiro é inteiro positivo em centavos: fração, zero, negativo e texto são recusados', () => {
  for (const valor of [20.5, 0, -100, '2000', MAXIMO_DE_DINHEIRO_EM_CENTAVOS + 1]) {
    assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, valor }).success, false, `valor ${valor}`);
  }
  assert.equal(RegistrarLancamento.parse({ ...lancamentoMinimo, valor: 1 }).valor, 1);
});

test('o teto por item deixa a soma de todas as etiquetas exata em number', () => {
  const etiquetas = Array.from({ length: 20 }, (_, indice) => ({
    categoriaId: `3f2504e0-4f89-41d3-9a0c-${String(indice).padStart(12, '0')}`,
    valor: MAXIMO_DE_DINHEIRO_EM_CENTAVOS,
  }));
  const lancamento = RegistrarLancamento.parse({ ...lancamentoMinimo, etiquetas });
  const soma = lancamento.etiquetas.reduce((total, { valor }) => total + valor, 0);

  assert.ok(Number.isSafeInteger(soma));
  assert.equal(BigInt(soma), BigInt(MAXIMO_DE_DINHEIRO_EM_CENTAVOS) * 20n);
});

test('etiquetas do caso Aline: naturezas misturadas cabem no contrato, e a soma fica para o agregado', () => {
  const lancamento = RegistrarLancamento.parse({
    ...lancamentoMinimo,
    etiquetas: [
      { categoriaId: UUID_A, valor: 7000 },
      { categoriaId: UUID_B, valor: 5000 },
      { categoriaId: UUID_C, valor: 10000 },
    ],
  });

  assert.equal(lancamento.etiquetas.length, 3);
});

test('a mesma categoria duas vezes nas etiquetas é recusada', () => {
  const etiquetas = [
    { categoriaId: UUID_A, valor: 100 },
    { categoriaId: UUID_A.toUpperCase(), valor: 200 },
  ];

  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, etiquetas })), [
    { caminho: 'etiquetas', regra: 'sem_duplicados' },
  ]);
  assert.deepEqual(regras(ConfirmarLancamento.safeParse({ etiquetas })), [{ caminho: 'etiquetas', regra: 'sem_duplicados' }]);
});

test('contraparte é a pessoa cadastrada ou o texto, nunca os dois', () => {
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, pessoaId: UUID_A, contraparteTexto: 'Aline' })), [
    { caminho: 'contraparteTexto', regra: 'contraparte_unica' },
  ]);
  assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, contraparteTexto: 'Aline' }).success, true);
});

test('data local precisa existir no calendário', () => {
  for (const data of ['2026-02-30', '2026-13-01', '26-02-01', '2026-2-1']) {
    assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, dataCompetencia: data }).success, false, data);
  }
  assert.equal(RegistrarLancamento.parse({ ...lancamentoMinimo, dataCompetencia: '2028-02-29' }).dataCompetencia, '2028-02-29');
});

const transferenciaSimples = {
  finalidade: 'MOVIMENTACAO_SIMPLES',
  valor: 384000,
  data: '2026-09-10',
  contaOrigemId: UUID_A,
  contaDestinoId: UUID_B,
  unidadeId: UUID_C,
  motivo: 'Movimentação para a caixinha',
};

test('transferência simples entre duas contas é aceita', () => {
  assert.equal(RegistrarTransferencia.safeParse(transferenciaSimples).success, true);
});

test('a finalidade exige a sua referência e recusa as demais', () => {
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...transferenciaSimples, finalidade: 'APORTE_A_FUNDO' })), [
    { caminho: 'fundoId', regra: 'referencia_da_finalidade' },
  ]);
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...transferenciaSimples, faturaId: UUID_A })), [
    { caminho: 'faturaId', regra: 'referencia_da_finalidade' },
  ]);
  assert.equal(
    RegistrarTransferencia.safeParse({ ...transferenciaSimples, finalidade: 'REPASSE_ENTRE_UNIDADES', unidadeDestinoId: UUID_A }).success,
    true,
  );
});

test('origem e destino iguais são recusados', () => {
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...transferenciaSimples, contaDestinoId: UUID_A })), [
    { caminho: 'contaDestinoId', regra: 'contas_iguais' },
  ]);
});

test('só o empréstimo admite uma das contas fora do sistema', () => {
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...transferenciaSimples, contaDestinoId: null })), [
    { caminho: 'contaDestinoId', regra: 'contas_da_transferencia' },
  ]);
  const emprestimo = { ...transferenciaSimples, finalidade: 'CONCESSAO_DE_EMPRESTIMO', emprestimoId: UUID_A, contaDestinoId: null };
  assert.equal(RegistrarTransferencia.safeParse(emprestimo).success, true);
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...emprestimo, contaOrigemId: null })), [
    { caminho: 'contaOrigemId', regra: 'contas_da_transferencia' },
  ]);
});

test('teto anual só na unidade comercial', () => {
  const unidade = { codigoSistema: 'MUNAY', nome: 'Munay', regime: 'CONTRIBUICAO', tetoAnual: 8100000 };

  assert.deepEqual(regras(CriarUnidade.safeParse(unidade)), [{ caminho: 'tetoAnual', regra: 'teto_so_na_comercial' }]);
  assert.equal(CriarUnidade.safeParse({ ...unidade, regime: 'COMERCIAL' }).success, true);
  assert.deepEqual(regras(EditarUnidade.safeParse({ nome: 'CDD', regime: 'CONTRIBUICAO', tetoAnual: 1, ativa: true })), [
    { caminho: 'tetoAnual', regra: 'teto_so_na_comercial' },
  ]);
});

test('código de sistema é maiúsculo, sem espaço', () => {
  for (const codigoSistema of ['munay', 'MU NAY', '1CDD', '']) {
    assert.equal(CriarUnidade.safeParse({ codigoSistema, nome: 'X', regime: 'CONTRIBUICAO' }).success, false, codigoSistema);
  }
});

test('categoria exige ao menos um regime, sem repetir', () => {
  const categoria = {
    codigoSistema: 'CONTRIB_CDD',
    nome: 'Contribuição',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    linhaRelatorio: 'Contribuições',
  };

  assert.equal(CriarCategoria.safeParse({ ...categoria, regimesPermitidos: [] }).success, false);
  assert.deepEqual(regras(CriarCategoria.safeParse({ ...categoria, regimesPermitidos: ['COMERCIAL', 'COMERCIAL'] })), [
    { caminho: 'regimesPermitidos', regra: 'sem_duplicados' },
  ]);
  assert.equal(CriarCategoria.safeParse({ ...categoria, regimesPermitidos: ['CONTRIBUICAO'] }).success, true);
});

test('conta pessoal de terceiro exige o titular, e só ela o aceita', () => {
  const conta = { nome: 'CC Nubank Paty', tipo: 'CONTA_CORRENTE', titularidade: 'PESSOAL_DE_TERCEIRO' };

  assert.deepEqual(regras(CriarConta.safeParse(conta)), [{ caminho: 'pessoaTitularId', regra: 'titular_da_conta_pessoal' }]);
  assert.equal(CriarConta.safeParse({ ...conta, pessoaTitularId: UUID_A }).success, true);
  assert.deepEqual(regras(CriarConta.safeParse({ ...conta, titularidade: 'INSTITUCIONAL', pessoaTitularId: UUID_A })), [
    { caminho: 'pessoaTitularId', regra: 'titular_da_conta_pessoal' },
  ]);
});

test('documento da pessoa: só dígitos, 11 na física e 14 na jurídica', () => {
  assert.equal(CadastrarPessoa.parse({ tipo: 'FISICA', nome: 'Aline' }).documento, null);
  assert.equal(CadastrarPessoa.safeParse({ tipo: 'FISICA', nome: 'Aline', documento: '12345678909' }).success, true);
  assert.deepEqual(regras(CadastrarPessoa.safeParse({ tipo: 'JURIDICA', nome: 'Centro', documento: '12345678909' })), [
    { caminho: 'documento', regra: 'documento_do_tipo' },
  ]);
  assert.equal(CadastrarPessoa.safeParse({ tipo: 'FISICA', nome: 'Aline', documento: '123.456.789-09' }).success, false);
});

test('competência é AAAA-MM com mês válido', () => {
  assert.equal(ParametrosDoPeriodo.safeParse({ unidadeId: UUID_A, competencia: '2026-09' }).success, true);
  for (const competencia of ['2026-13', '2026-9', '2026-09-01']) {
    assert.equal(ParametrosDoPeriodo.safeParse({ unidadeId: UUID_A, competencia }).success, false, competencia);
  }
});

test('reabertura de período exige motivo de pelo menos dez caracteres', () => {
  assert.equal(ReabrirPeriodo.safeParse({ motivo: '   curto   ' }).success, false);
  assert.equal(ReabrirPeriodo.safeParse({ motivo: 'Nota fiscal chegou atrasada' }).success, true);
});
