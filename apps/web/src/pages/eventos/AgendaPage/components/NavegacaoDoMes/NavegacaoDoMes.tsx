import { BotaoDeIcone, type Density } from '@/ds';
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
      <BotaoDeIcone
        icone="arrow-left"
        tamanhoDoIcone={16}
        medida={36}
        aria-label="Mês anterior"
        onClick={() => onNavegar(-1)}
        style={setaDoMes}
      />
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', minWidth: 150, textAlign: 'center' }}>
        {nomeDoMes(mes - 1)} de {ano}
      </span>
      <BotaoDeIcone
        icone="arrow-right"
        tamanhoDoIcone={16}
        medida={36}
        aria-label="Próximo mês"
        onClick={() => onNavegar(1)}
        style={setaDoMes}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {doMes.length === 0 ? 'nenhuma cerimônia' : pluralizar(doMes.length, 'cerimônia no mês', 'cerimônias no mês')}
      </span>
    </div>
  );
}
