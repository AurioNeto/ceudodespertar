import { Icon, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { Trabalho } from '../../tipos';
import { nomeDoMes } from '../../utils/nomeDoMes';
import { setaDoMes } from './constantes';

export interface NavegacaoDoMesProps {
  ano: number;
  mes: number;
  doMes: readonly Trabalho[];
  densidade: Density;
  onNavegar: (delta: number) => void;
}

export function NavegacaoDoMes({ ano, mes, doMes, densidade, onNavegar }: NavegacaoDoMesProps) {
  const campo = densidade === 'field';

  return (
    <div style={{ marginLeft: campo ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => onNavegar(-1)}
        style={setaDoMes}
      >
        <Icon name="arrow-left" size={16} color="var(--color-royal)" />
      </button>
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', minWidth: 150, textAlign: 'center' }}>
        {nomeDoMes(mes - 1)} de {ano}
      </span>
      <button type="button" aria-label="Próximo mês" onClick={() => onNavegar(1)} style={setaDoMes}>
        <Icon name="arrow-right" size={16} color="var(--color-royal)" />
      </button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {doMes.length === 0 ? 'nenhuma cerimônia' : pluralizar(doMes.length, 'cerimônia no mês', 'cerimônias no mês')}
      </span>
    </div>
  );
}
