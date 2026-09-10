import type { ContaId, DevolucaoEmprestimoId, Emprestimo, EmprestimoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Os três empréstimos vivos da casa.
 *
 * Dois vêm nominalmente dos documentos: os R$ 4.800 do aluguel, concedidos e
 * devolvidos, e os R$ 6.000 com devolução parcial de R$ 562,40 — que é
 * exatamente o caso que a planilha não conseguia representar, porque lá o
 * empréstimo entrava como despesa e a devolução como receita.
 */

const dev = (n: string) => id<DevolucaoEmprestimoId>(n);

export const emprestimos: readonly Emprestimo[] = [
  {
    id: id<EmprestimoId>('e-erico'),
    direcao: 'CONCEDIDO',
    contraparteId: id<PessoaId>('p-erico'),
    contraparteNome: 'Érico Santana',
    valorPrincipal: reais(6000),
    dataConcessao: dataLocal('2026-05-04'),
    contaId: id<ContaId>('cora'),
    contaNome: 'Cora PJ',
    motivo: 'apoio em despesa médica da família',
    observacao: 'Devolução combinada sem prazo fechado, conforme a condição dele.',
    devolucoes: [
      {
        id: dev('d-erico-1'),
        valor: reais(562.4),
        data: dataLocal('2026-08-18'),
        contaId: id<ContaId>('cora'),
        contaNome: 'Cora PJ',
        registradoPorNome: 'Aurio Neto',
      },
    ],
  },
  {
    id: id<EmprestimoId>('e-marta'),
    direcao: 'RECEBIDO',
    contraparteId: id<PessoaId>('p-marta'),
    contraparteNome: 'Marta Neto',
    valorPrincipal: reais(3000),
    dataConcessao: dataLocal('2026-06-22'),
    contaId: id<ContaId>('cora'),
    contaNome: 'Cora PJ',
    motivo: 'cobrir o material da obra do dormitório',
    observacao: 'A devolver conforme entrarem as contribuições de setembro.',
    devolucoes: [
      {
        id: dev('d-marta-1'),
        valor: reais(1500),
        data: dataLocal('2026-08-10'),
        contaId: id<ContaId>('cora'),
        contaNome: 'Cora PJ',
        registradoPorNome: 'Aurio Neto',
      },
    ],
  },
  {
    id: id<EmprestimoId>('e-ze'),
    direcao: 'CONCEDIDO',
    contraparteId: id<PessoaId>('p-ze'),
    contraparteNome: 'Zé Ferreira',
    valorPrincipal: reais(4800),
    dataConcessao: dataLocal('2026-03-12'),
    contaId: id<ContaId>('cora'),
    contaNome: 'Cora PJ',
    motivo: 'aluguel atrasado',
    observacao: null,
    devolucoes: [
      {
        id: dev('d-ze-1'),
        valor: reais(2400),
        data: dataLocal('2026-05-15'),
        contaId: id<ContaId>('cora'),
        contaNome: 'Cora PJ',
        registradoPorNome: 'Aurio Neto',
      },
      {
        id: dev('d-ze-2'),
        valor: reais(2400),
        data: dataLocal('2026-07-20'),
        contaId: id<ContaId>('especie'),
        contaNome: 'Espécie',
        registradoPorNome: 'Chico Aguiar',
      },
    ],
  },
];

export const devolvido = (e: Emprestimo): number => e.devolucoes.reduce((soma, d) => soma + d.valor, 0);

/** E2: a soma das devoluções nunca excede o principal, então o saldo nunca é negativo. */
export const saldoDevedor = (e: Emprestimo): number => e.valorPrincipal - devolvido(e);

export const quitado = (e: Emprestimo): boolean => saldoDevedor(e) === 0;

export const contasDeEmprestimo: readonly { readonly id: ContaId; readonly nome: string }[] = [
  { id: id<ContaId>('cora'), nome: 'Cora PJ' },
  { id: id<ContaId>('especie'), nome: 'Espécie' },
  { id: id<ContaId>('itau'), nome: 'Itaú Munay' },
];

/** Quem já tem cadastro e pode ser contraparte de um empréstimo novo. */
export const contrapartesConhecidas: readonly { readonly id: PessoaId; readonly nome: string }[] = [
  { id: id<PessoaId>('p-erico'), nome: 'Érico Santana' },
  { id: id<PessoaId>('p-marta'), nome: 'Marta Neto' },
  { id: id<PessoaId>('p-ze'), nome: 'Zé Ferreira' },
  { id: id<PessoaId>('p-lucia'), nome: 'Lucia Prado' },
  { id: id<PessoaId>('p-chico'), nome: 'Chico Aguiar' },
];
