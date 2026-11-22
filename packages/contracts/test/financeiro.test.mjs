import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CadastrarPessoa,
  ConfirmarLancamento,
  ConfirmarTransferencia,
  CriarCategoria,
  CriarConta,
  CriarFundo,
  CriarUnidade,
  DevolverLancamento,
  EditarConta,
  EditarFundo,
  EditarLancamento,
  EnviarAnexo,
  MAXIMO_DE_DINHEIRO_EM_CENTAVOS,
  EditarUnidade,
  ParametrosDaCompetencia,
  ParametrosDoCadastro,
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
  assert.equal(ParametrosDaCompetencia.safeParse({ competencia: '2026-09' }).success, true);
  for (const competencia of ['2026-13', '2026-9', '2026-09-01']) {
    assert.equal(ParametrosDaCompetencia.safeParse({ competencia }).success, false, competencia);
  }
});

test('fechar e reabrir são por competência da casa: a rota não leva unidade', () => {
  assert.deepEqual(ParametrosDaCompetencia.parse({ unidadeId: UUID_A, competencia: '2026-09' }), { competencia: '2026-09' });
});

test('reabertura de período exige motivo de pelo menos dez caracteres', () => {
  assert.equal(ReabrirPeriodo.safeParse({ motivo: '   curto   ' }).success, false);
  assert.equal(ReabrirPeriodo.safeParse({ motivo: 'Nota fiscal chegou atrasada' }).success, true);
});

test('identificador do cadastro na rota é um UUID e sai em minúsculas', () => {
  assert.equal(ParametrosDoCadastro.parse({ id: UUID_A.toUpperCase() }).id, UUID_A);
  assert.equal(ParametrosDoCadastro.safeParse({ id: 'nao-e-uuid' }).success, false);
});

test('motivo é opcional no registro do lançamento e da transferência', () => {
  assert.equal(RegistrarLancamento.parse({ natureza: 'DESPESA', valor: 2000 }).motivo, null);
  assert.equal(EditarLancamento.parse({ natureza: 'DESPESA', valor: 2000 }).motivo, null);
  const { motivo: _motivo, ...semMotivo } = transferenciaSimples;
  assert.equal(RegistrarTransferencia.parse(semMotivo).motivo, null);
});

test('no registro a etiqueta pode vir sem valor; a confirmação exige valor em todas', () => {
  const lancamento = RegistrarLancamento.parse({ ...lancamentoMinimo, etiquetas: [{ categoriaId: UUID_A }] });

  assert.deepEqual(lancamento.etiquetas, [{ categoriaId: UUID_A, valor: null }]);
  assert.equal(ConfirmarLancamento.safeParse({ etiquetas: [{ categoriaId: UUID_A }] }).success, false);
  assert.equal(ConfirmarLancamento.safeParse({ etiquetas: [{ categoriaId: UUID_A, valor: 2000 }] }).success, true);
  assert.equal(ConfirmarLancamento.safeParse({}).success, true);
});

test('registrar já confirmado é pedido explícito e por padrão não acontece', () => {
  assert.equal(RegistrarLancamento.parse(lancamentoMinimo).confirmarNoRegistro, false);
  assert.equal(
    RegistrarLancamento.safeParse({ ...lancamentoMinimo, confirmarNoRegistro: true, etiquetas: [{ categoriaId: UUID_A, valor: 2000 }] })
      .success,
    true,
  );
});

test('registrar já confirmado exige etiquetas, todas com valor, e o motivo', () => {
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ natureza: 'DESPESA', valor: 2000, confirmarNoRegistro: true })), [
    { caminho: 'etiquetas', regra: 'confirmado_exige_etiquetas_com_valor' },
    { caminho: 'motivo', regra: 'confirmado_exige_motivo' },
  ]);
  const etiquetas = [{ categoriaId: UUID_A, valor: 1500 }, { categoriaId: UUID_B }];
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, confirmarNoRegistro: true, etiquetas })), [
    { caminho: 'etiquetas', regra: 'confirmado_exige_etiquetas_com_valor' },
  ]);
});

test('valor composto: as parcelas somam o valor e não nascem confirmadas', () => {
  assert.deepEqual(RegistrarLancamento.parse({ ...lancamentoMinimo, parcelas: [1200, 800] }).parcelas, [1200, 800]);
  assert.equal(RegistrarLancamento.parse(lancamentoMinimo).parcelas, null);
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, parcelas: [1200, 700] })), [
    { caminho: 'parcelas', regra: 'parcelas_somam_o_valor' },
  ]);
  assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, parcelas: [2000] }).success, false);
  const etiquetas = [{ categoriaId: UUID_A, valor: 2000 }];
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, parcelas: [1200, 800], confirmarNoRegistro: true, etiquetas })), [
    { caminho: 'parcelas', regra: 'composto_nao_nasce_confirmado' },
  ]);
});

test('quem adiantou é a pessoa cadastrada ou o nome em texto, nunca os dois', () => {
  assert.equal(RegistrarLancamento.parse({ ...lancamentoMinimo, reembolsoATexto: '  Lucia Prado ' }).reembolsoATexto, 'Lucia Prado');
  assert.deepEqual(regras(RegistrarLancamento.safeParse({ ...lancamentoMinimo, reembolsoAId: UUID_A, reembolsoATexto: 'Lucia' })), [
    { caminho: 'reembolsoATexto', regra: 'reembolsado_unico' },
  ]);
});

test('devolver o lançamento exige o motivo', () => {
  assert.equal(DevolverLancamento.safeParse({ motivo: '   ' }).success, false);
  assert.equal(DevolverLancamento.parse({ motivo: ' falta o comprovante ' }).motivo, 'falta o comprovante');
});

test('responsável da conta é texto livre, vazio por padrão', () => {
  const conta = { nome: 'Cora PJ', tipo: 'CONTA_CORRENTE', titularidade: 'INSTITUCIONAL' };

  assert.equal(CriarConta.parse(conta).responsavel, '');
  assert.equal(CriarConta.parse({ ...conta, responsavel: ' Paty ' }).responsavel, 'Paty');
  assert.equal(EditarConta.parse({ nome: 'Cora PJ', ativa: true, responsavel: 'Paty' }).responsavel, 'Paty');
  assert.equal(CriarConta.parse(conta).identificadorBancario, null);
  assert.equal(CriarConta.parse(conta).unidadeId, null);
});

test('fundo criado pela tela: código, conta vinculada, categorias e meta podem faltar', () => {
  const fundo = CriarFundo.parse({ nome: 'Obra do dormitório' });

  assert.equal(fundo.codigoSistema, null);
  assert.equal(fundo.contaVinculadaId, null);
  assert.deepEqual(fundo.categoriasPermitidas, []);
  assert.equal(fundo.meta, null);
  assert.equal(CriarFundo.safeParse({ nome: 'Obra', codigoSistema: 'obra' }).success, false);
});

test('valor reservado do fundo é opcional, inteiro e pode ser zero', () => {
  assert.equal(CriarFundo.parse({ nome: 'Obra' }).valorReservado, null);
  assert.equal(EditarFundo.parse({ nome: 'Obra', ativo: true, contaVinculadaId: UUID_A, valorReservado: 0 }).valorReservado, 0);
  assert.equal(CriarFundo.safeParse({ nome: 'Obra', valorReservado: -1 }).success, false);
});

test('na edição do fundo a conta vinculada continua obrigatória', () => {
  assert.equal(EditarFundo.safeParse({ nome: 'Obra', ativo: true }).success, false);
  assert.equal(EditarFundo.safeParse({ nome: 'Obra', ativo: true, contaVinculadaId: UUID_A }).success, true);
});

test('confirmar transferência não leva corpo; transferência aceita comprovante', () => {
  assert.deepEqual(ConfirmarTransferencia.parse({}), {});
  assert.equal(RegistrarTransferencia.parse({ ...transferenciaSimples, comprovanteId: UUID_A }).comprovanteId, UUID_A);
  assert.equal(RegistrarTransferencia.parse(transferenciaSimples).comprovanteId, null);
});

test('envio de anexo descreve o arquivo: nome, tipo e tamanho inteiro positivo', () => {
  assert.equal(EnviarAnexo.safeParse({ nome: 'IMG_2481.jpg', tipo: 'image/jpeg', tamanhoBytes: 182044 }).success, true);
  for (const tamanhoBytes of [0, -1, 1.5]) {
    assert.equal(EnviarAnexo.safeParse({ nome: 'a.pdf', tipo: 'application/pdf', tamanhoBytes }).success, false, String(tamanhoBytes));
  }
  assert.equal(EnviarAnexo.safeParse({ nome: ' ', tipo: 'application/pdf', tamanhoBytes: 1 }).success, false);
});

test('reserva do fundo dentro da conta: aporte e resgate admitem origem igual ao destino', () => {
  const reserva = { ...transferenciaSimples, contaDestinoId: UUID_A, fundoId: UUID_B };

  assert.equal(RegistrarTransferencia.safeParse({ ...reserva, finalidade: 'APORTE_A_FUNDO' }).success, true);
  assert.equal(RegistrarTransferencia.safeParse({ ...reserva, finalidade: 'RESGATE_DE_FUNDO' }).success, true);
  assert.deepEqual(regras(RegistrarTransferencia.safeParse({ ...reserva, finalidade: 'RESGATE_DE_FUNDO', fundoId: null })), [
    { caminho: 'fundoId', regra: 'referencia_da_finalidade' },
  ]);
});

test('valor composto aceita até 20 parcelas', () => {
  const vinte = Array.from({ length: 20 }, () => 100);
  assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, valor: 2000, parcelas: vinte }).success, true);
  assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, valor: 2100, parcelas: [...vinte, 100] }).success, false);
});

test('envio de anexo recusa nome e tipo acima do tamanho máximo', () => {
  const anexo = { nome: 'a.pdf', tipo: 'application/pdf', tamanhoBytes: 1 };
  assert.equal(EnviarAnexo.safeParse({ ...anexo, nome: `${'a'.repeat(252)}.pdf` }).success, false);
  assert.equal(EnviarAnexo.safeParse({ ...anexo, tipo: 'a'.repeat(121) }).success, false);
});

test('etiqueta com valor zero é recusada no registro e na confirmação', () => {
  assert.equal(RegistrarLancamento.safeParse({ ...lancamentoMinimo, etiquetas: [{ categoriaId: UUID_A, valor: 0 }] }).success, false);
  assert.equal(ConfirmarLancamento.safeParse({ etiquetas: [{ categoriaId: UUID_A, valor: 0 }] }).success, false);
});
