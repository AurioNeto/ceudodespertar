import { describe, expect, it } from 'vitest';
import { PERMISSOES, type Permissao } from '@cdd/contracts';
import { TELAS } from './telas';
import type { RotaId } from './navegacao';

const LIVRES: readonly RotaId[] = ['painel', 'perfil'];
const registros = Object.entries(TELAS) as [RotaId, (typeof TELAS)[RotaId]][];

const ACESSO_APROVADO: Record<RotaId, readonly Permissao[]> = {
  painel: [],
  registrar: ['financeiro.lancamento.registrar'],
  meus: ['financeiro.lancamento.ler_proprios'],
  lote: ['financeiro.lancamento.confirmar'],
  lancamentos: ['financeiro.lancamento.ler'],
  contas: ['financeiro.conta.ler'],
  faturas: ['financeiro.fatura.gerenciar'],
  emprestimos: ['financeiro.emprestimo.gerenciar'],
  adiantamentos: [
    'financeiro.adiantamento.registrar',
    'financeiro.adiantamento.autorizar',
    'financeiro.adiantamento.ressarcir',
  ],
  relatorios: ['financeiro.dre.ler', 'financeiro.fluxo_caixa.ler', 'financeiro.resultado_evento.ler'],
  fechamento: ['financeiro.periodo.fechar'],
  prestacao: ['financeiro.prestacao_contas.gerar'],
  devolucoes: ['eventos.devolucao.efetivar'],
  conciliacao: ['financeiro.conciliacao.executar'],
  parametros: ['financeiro.plano_contas.gerenciar', 'sistema.parametro.gerenciar'],
  agenda: ['eventos.evento.editar', 'eventos.inscricao.ler'],
  inscricao: ['eventos.inscricao.ler'],
  leitos: ['eventos.operacao.ler'],
  contratacoes: ['eventos.contratacao.gerenciar'],
  ayahuasca: ['estoque.saldo.ler'],
  feitio: ['estoque.feitio.gerenciar'],
  pessoas: ['pessoas.pessoa.ler'],
  anamnese: ['pessoas.anamnese.ler'],
  acessos: ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'],
  auditoria: ['sistema.auditoria.ler'],
  perfil: [],
};

describe('registro de telas', () => {
  it('cada tela exige as permissões aprovadas', () => {
    const acessoAtual = Object.fromEntries(registros.map(([id, registro]) => [id, registro.acesso]));
    expect(acessoAtual).toEqual(ACESSO_APROVADO);
  });

  it.each(registros.filter(([id]) => !LIVRES.includes(id)))('%s exige alguma permissão', (_id, registro) => {
    expect(registro.acesso.length).toBeGreaterThan(0);
  });

  it.each(LIVRES)('%s é livre', (id) => {
    expect(TELAS[id].acesso).toEqual([]);
  });

  it('toda permissão citada existe no catálogo', () => {
    const citadas = registros.flatMap(([, registro]) => registro.acesso);
    expect(citadas.filter((permissao) => !PERMISSOES.includes(permissao))).toEqual([]);
  });

  it('cada tela tem objeto próprio', () => {
    expect(new Set(registros.map(([, registro]) => registro)).size).toBe(registros.length);
  });
});
