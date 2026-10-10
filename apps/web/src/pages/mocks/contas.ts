import type { Conta, ContaId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id } from '@/mocks/ids';

export const contas: readonly Conta[] = [
  {
    id: id<ContaId>('cora'),
    nome: 'Cora PJ',
    descricao: 'conta principal da casa · CNPJ do CDD',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Aurio Neto',
    saldo: reais(41902.1),
    ultimoMovimento: dataLocal('2026-09-02'),
    conciliacao: 'CONCILIADA',
    alerta: null,
    ativa: true,
  },
  {
    id: id<ContaId>('especie'),
    nome: 'Espécie',
    descricao: 'caixa da chácara · cofre da secretaria',
    tipo: 'DINHEIRO',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Chico Aguiar',
    saldo: reais(3180.4),
    ultimoMovimento: dataLocal('2026-08-19'),
    conciliacao: 'PENDENTE',
    alerta: 'Última contagem física foi em 31/07. O combinado é contar todo dia 15.',
    ativa: true,
  },
  {
    id: id<ContaId>('nubank'),
    nome: 'Nubank Paty',
    descricao: 'conta pessoal usada em nome da casa',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'PESSOAL_DE_TERCEIRO',
    pessoaTitularId: id<PessoaId>('p-paty'),
    responsavel: 'Paty Munay',
    saldo: reais(1240.55),
    ultimoMovimento: dataLocal('2026-08-23'),
    conciliacao: 'PENDENTE',
    alerta: 'Conta pessoal: o combinado é zerar para o Cora até o fim de cada mês.',
    ativa: true,
  },
  {
    id: id<ContaId>('itau'),
    nome: 'Itaú Munay',
    descricao: 'unidade comercial · lojinha',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Paty Munay',
    saldo: reais(37994.85),
    ultimoMovimento: dataLocal('2026-08-22'),
    conciliacao: 'CONCILIADA',
    alerta: null,
    ativa: true,
  },
];

export const fundoProprio = reais(39235.4);
