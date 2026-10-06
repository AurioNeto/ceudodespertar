import { CATALOGO_DE_PERMISSOES, CODIGOS_DE_GRUPO_DE_SISTEMA, PERMISSOES, type CodigoGrupo } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { GRUPOS_DE_SISTEMA } from './grupos-de-sistema.js';

function permissoesDe(codigo: CodigoGrupo): readonly string[] {
  const grupo = GRUPOS_DE_SISTEMA.find((candidato) => candidato.codigoSistema === codigo);
  if (grupo === undefined) throw new Error(`grupo ausente: ${codigo}`);
  return grupo.permissoes;
}

function ordenadas(permissoes: readonly string[]): readonly string[] {
  return permissoes.toSorted();
}

const GOVERNANCA = [
  'financeiro.lancamento.ler',
  'financeiro.conta.ler',
  'financeiro.dre.ler',
  'financeiro.fluxo_caixa.ler',
  'financeiro.resultado_evento.ler',
  'financeiro.reembolsos.ler',
  'financeiro.plano_contas.ler',
  'financeiro.adiantamento.autorizar',
  'financeiro.prestacao_contas.gerar',
  'financeiro.prestacao_contas.detalhada',
  'eventos.inscricao.ler',
  'eventos.arrecadacao.ler',
  'eventos.operacao.ler',
  'eventos.contratacao.gerenciar',
  'pessoas.pessoa.ler',
  'pessoas.vinculo.gerenciar',
  'estoque.saldo.ler',
  'sistema.auditoria.ler',
];

const TESOURARIA = [
  'financeiro.lancamento.registrar',
  'financeiro.lancamento.confirmar',
  'financeiro.lancamento.estornar',
  'financeiro.lancamento.ler',
  'financeiro.lancamento.ler_proprios',
  'financeiro.transferencia.registrar',
  'financeiro.conta.ler',
  'financeiro.conta.gerenciar',
  'financeiro.fundo.gerenciar',
  'financeiro.fatura.gerenciar',
  'financeiro.emprestimo.gerenciar',
  'financeiro.adiantamento.registrar',
  'financeiro.adiantamento.ressarcir',
  'financeiro.reembolsos.ler',
  'financeiro.importacao.executar',
  'financeiro.conciliacao.executar',
  'financeiro.periodo.fechar',
  'financeiro.plano_contas.ler',
  'financeiro.plano_contas.gerenciar',
  'financeiro.dre.ler',
  'financeiro.fluxo_caixa.ler',
  'financeiro.resultado_evento.ler',
  'financeiro.prestacao_contas.gerar',
  'financeiro.prestacao_contas.detalhada',
  'eventos.inscricao.ler',
  'eventos.pagamento.registrar',
  'eventos.arrecadacao.ler',
  'eventos.devolucao.solicitar',
  'eventos.devolucao.efetivar',
  'eventos.operacao.ler',
  'eventos.contratacao.gerenciar',
  'pessoas.pessoa.registrar',
  'pessoas.pessoa.editar',
  'pessoas.pessoa.ler',
  'estoque.item.gerenciar',
  'estoque.movimento.registrar',
  'estoque.feitio.gerenciar',
  'estoque.saldo.ler',
];

const ACOLHIMENTO = [
  'eventos.evento.criar',
  'eventos.evento.editar',
  'eventos.evento.cancelar',
  'eventos.evento.realizar',
  'eventos.inscricoes.abrir',
  'eventos.inscricao.registrar',
  'eventos.inscricao.editar',
  'eventos.inscricao.confirmar',
  'eventos.inscricao.cancelar',
  'eventos.inscricao.ler',
  'eventos.pagamento.registrar',
  'eventos.arrecadacao.ler',
  'eventos.devolucao.solicitar',
  'eventos.operacao.ler',
  'eventos.operacao.gerenciar',
  'eventos.acolhimento.registrar',
  'pessoas.pessoa.registrar',
  'pessoas.pessoa.editar',
  'pessoas.pessoa.ler',
  'pessoas.vinculo.gerenciar',
  'pessoas.anamnese.ler',
  'pessoas.anamnese.analisar',
  'pessoas.formulario.editar',
  'pessoas.formulario.publicar',
  'pessoas.autorizacao_responsavel.registrar',
  'pessoas.consentimento.registrar',
  'estoque.consumo.registrar',
  'estoque.saldo.ler',
];

const REGISTRO = [
  'financeiro.lancamento.registrar',
  'financeiro.lancamento.ler_proprios',
  'financeiro.plano_contas.ler',
  'estoque.movimento.registrar',
];

const LEITURA = [
  'financeiro.dre.ler',
  'financeiro.fluxo_caixa.ler',
  'financeiro.resultado_evento.ler',
  'financeiro.plano_contas.ler',
  'estoque.saldo.ler',
];

describe('GRUPOS_DE_SISTEMA', () => {
  it('traz exatamente os seis grupos de sistema, cada um uma vez', () => {
    const codigos = GRUPOS_DE_SISTEMA.map((grupo) => grupo.codigoSistema);

    expect(ordenadas(codigos)).toStrictEqual(ordenadas(CODIGOS_DE_GRUPO_DE_SISTEMA));
  });

  it('cada grupo tem nome e descrição preenchidos', () => {
    expect(GRUPOS_DE_SISTEMA.every((grupo) => grupo.nome.trim() !== '' && grupo.descricao.trim() !== '')).toBe(true);
  });

  it('todo código de permissão pertence ao catálogo', () => {
    const foraDoCatalogo = GRUPOS_DE_SISTEMA.flatMap((grupo) => grupo.permissoes).filter(
      (permissao) => !Object.hasOwn(CATALOGO_DE_PERMISSOES, permissao),
    );

    expect(foraDoCatalogo).toStrictEqual([]);
  });

  it('nenhum grupo repete permissão', () => {
    const comRepeticao = GRUPOS_DE_SISTEMA.filter((grupo) => new Set(grupo.permissoes).size !== grupo.permissoes.length);

    expect(comRepeticao.map((grupo) => grupo.codigoSistema)).toStrictEqual([]);
  });

  it('ADMINISTRADOR tem as 64 permissões do catálogo', () => {
    expect(permissoesDe('ADMINISTRADOR')).toHaveLength(64);
    expect(ordenadas(permissoesDe('ADMINISTRADOR'))).toStrictEqual(ordenadas(PERMISSOES));
  });

  it('GOVERNANCA tem 18 permissões, as do seed', () => {
    expect(permissoesDe('GOVERNANCA')).toHaveLength(18);
    expect(ordenadas(permissoesDe('GOVERNANCA'))).toStrictEqual(ordenadas(GOVERNANCA));
  });

  it('TESOURARIA tem 38 permissões, as da matriz', () => {
    expect(permissoesDe('TESOURARIA')).toHaveLength(38);
    expect(ordenadas(permissoesDe('TESOURARIA'))).toStrictEqual(ordenadas(TESOURARIA));
  });

  it('TESOURARIA: 24 financeiras, 7 de eventos, 3 de pessoas e 4 de estoque', () => {
    const contar = (modulo: string) =>
      permissoesDe('TESOURARIA').filter((permissao) => permissao.startsWith(`${modulo}.`)).length;

    expect([contar('financeiro'), contar('eventos'), contar('pessoas'), contar('estoque'), contar('sistema')]).toStrictEqual([
      24, 7, 3, 4, 0,
    ]);
  });

  it('TESOURARIA não autoriza adiantamento nem reabre período', () => {
    expect(permissoesDe('TESOURARIA')).not.toContain('financeiro.adiantamento.autorizar');
    expect(permissoesDe('TESOURARIA')).not.toContain('financeiro.periodo.reabrir');
  });

  it('ACOLHIMENTO tem 28 permissões, sem plano de contas e sem resposta por terceiro', () => {
    expect(permissoesDe('ACOLHIMENTO')).toHaveLength(28);
    expect(ordenadas(permissoesDe('ACOLHIMENTO'))).toStrictEqual(ordenadas(ACOLHIMENTO));
  });

  it('ACOLHIMENTO não tem nenhuma permissão financeira', () => {
    expect(permissoesDe('ACOLHIMENTO').some((permissao) => permissao.startsWith('financeiro.'))).toBe(false);
  });

  it('REGISTRO tem 4 permissões', () => {
    expect(permissoesDe('REGISTRO')).toHaveLength(4);
    expect(ordenadas(permissoesDe('REGISTRO'))).toStrictEqual(ordenadas(REGISTRO));
  });

  it('LEITURA tem 5 permissões', () => {
    expect(permissoesDe('LEITURA')).toHaveLength(5);
    expect(ordenadas(permissoesDe('LEITURA'))).toStrictEqual(ordenadas(LEITURA));
  });
});
