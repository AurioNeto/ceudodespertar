import type { Permissao } from '@cdd/contracts';
import type { RotaId } from './navegacao';

export type FonteDaTela = 'mock' | 'api';

export interface RegistroDaTela {
  readonly fonte: FonteDaTela;
  readonly acesso: readonly Permissao[];
}

export type RegistroDeTelas = Record<RotaId, RegistroDaTela>;

export const TELAS: RegistroDeTelas = {
  painel: { fonte: 'mock', acesso: [] },
  registrar: { fonte: 'mock', acesso: ['financeiro.lancamento.registrar'] },
  meus: { fonte: 'mock', acesso: ['financeiro.lancamento.ler_proprios'] },
  lote: { fonte: 'mock', acesso: ['financeiro.lancamento.confirmar'] },
  lancamentos: { fonte: 'mock', acesso: ['financeiro.lancamento.ler'] },
  contas: { fonte: 'mock', acesso: ['financeiro.conta.ler'] },
  faturas: { fonte: 'mock', acesso: ['financeiro.fatura.gerenciar'] },
  emprestimos: { fonte: 'mock', acesso: ['financeiro.emprestimo.gerenciar'] },
  adiantamentos: { fonte: 'mock', acesso: ['financeiro.adiantamento.registrar', 'financeiro.adiantamento.autorizar', 'financeiro.adiantamento.ressarcir'] },
  relatorios: { fonte: 'mock', acesso: ['financeiro.dre.ler', 'financeiro.fluxo_caixa.ler', 'financeiro.resultado_evento.ler'] },
  fechamento: { fonte: 'mock', acesso: ['financeiro.periodo.fechar'] },
  conciliacao: { fonte: 'mock', acesso: ['financeiro.conciliacao.executar'] },
  devolucoes: { fonte: 'mock', acesso: ['eventos.devolucao.efetivar'] },
  prestacao: { fonte: 'mock', acesso: ['financeiro.prestacao_contas.gerar'] },
  parametros: { fonte: 'mock', acesso: ['financeiro.plano_contas.gerenciar', 'sistema.parametro.gerenciar'] },
  agenda: { fonte: 'mock', acesso: ['eventos.evento.editar', 'eventos.inscricao.ler'] },
  inscricao: { fonte: 'mock', acesso: ['eventos.inscricao.ler'] },
  leitos: { fonte: 'mock', acesso: ['eventos.operacao.ler'] },
  contratacoes: { fonte: 'mock', acesso: ['eventos.contratacao.gerenciar'] },
  ayahuasca: { fonte: 'mock', acesso: ['estoque.saldo.ler'] },
  feitio: { fonte: 'mock', acesso: ['estoque.feitio.gerenciar'] },
  pessoas: { fonte: 'mock', acesso: ['pessoas.pessoa.ler'] },
  anamnese: { fonte: 'mock', acesso: ['pessoas.anamnese.ler'] },
  acessos: { fonte: 'api', acesso: ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'] },
  auditoria: { fonte: 'mock', acesso: ['sistema.auditoria.ler'] },
  perfil: { fonte: 'api', acesso: [] },
};
