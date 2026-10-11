import { pluralizar } from '@/pages/utils/formato';
import type { useRelatorio } from '../hooks/useRelatorio';
import type { LinhaDoRelatorio } from '../mocks/relatorios';
import type { Drill } from '../tipos';

type Relatorio = ReturnType<typeof useRelatorio>;

export const resumoDoRecorte = (r: Pick<Relatorio, 'rotuloPeriodo' | 'unidades' | 'filtros'>) =>
  [
    r.rotuloPeriodo,
    r.unidades.join(' + '),
    r.filtros.grupo !== 'todos' ? r.filtros.grupo : null,
    r.filtros.categoria !== 'todas' ? r.filtros.categoria : null,
    r.filtros.conta !== 'todas' ? r.filtros.conta : null,
    r.filtros.tipo !== 'todos' ? r.filtros.tipo : null,
    r.filtros.cerimonia !== 'todas' ? r.filtros.cerimonia : null,
    r.filtros.situacao !== 'todas' ? r.filtros.situacao : null,
  ]
    .filter(Boolean)
    .join(' · ');

export const kpisDoRelatorio = (
  r: Pick<Relatorio, 'entradas' | 'saidas' | 'resultado' | 'transferencias' | 'transferenciasQtd' | 'comparados'>,
) => [
  {
    label: 'Entradas',
    valor: r.entradas,
    base: r.comparados?.entradas ?? null,
    cor: 'var(--color-confirmed)',
    bomSeSobe: true,
    nota: null,
  },
  {
    label: 'Saídas',
    valor: r.saidas,
    base: r.comparados?.saidas ?? null,
    cor: 'var(--color-attention)',
    bomSeSobe: false,
    nota: null,
  },
  {
    label: 'Resultado',
    valor: r.resultado,
    base: r.comparados?.resultado ?? null,
    cor: r.resultado >= 0 ? 'var(--color-royal-deep)' : 'var(--color-attention)',
    bomSeSobe: true,
    nota: null,
  },
  {
    label: 'Transferências',
    valor: r.transferencias,
    base: null,
    cor: 'var(--text-primary)',
    bomSeSobe: true,
    nota: `${pluralizar(r.transferenciasQtd, 'movimento')} entre contas`,
  },
];

export const linhasDoDrill = (atual: readonly LinhaDoRelatorio[], drill: Drill | null): readonly LinhaDoRelatorio[] =>
  drill ? atual.filter((l) => l[drill.campo] === drill.valor && (!drill.tipo || l.tipo === drill.tipo)) : [];

export const totalDoDrill = (linhas: readonly LinhaDoRelatorio[]) => linhas.reduce((a, l) => a + l.valor, 0);
