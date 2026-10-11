import { Icon, StatusBadge, Cartao, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { Agrupamento } from '../../../../tipos';
import type { GrupoDeAcesso } from '../../utils/agruparAcessos';
import { rajada } from '../../utils/rajada';
import { LinhaDeAcesso } from './components/LinhaDeAcesso';

export interface GrupoDeAcessosProps {
  grupo: GrupoDeAcesso;
  agrupamento: Agrupamento;
  densidade: Density;
}

export function GrupoDeAcessos({ grupo, agrupamento, densidade }: GrupoDeAcessosProps) {
  const campo = densidade === 'field';
  const emRajada = agrupamento === 'leitor' ? rajada(grupo.registros) : null;
  const semContexto = grupo.registros.filter((r) => r.contexto === null).length;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <Icon
          name={agrupamento === 'leitor' ? 'user-round' : 'clipboard-list'}
          size={17}
          color="var(--color-ink-brand)"
        />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{grupo.titulo}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>· {grupo.legenda}</span>
        <span style={{ flex: 1 }} />
        <StatusBadge tone="neutral">{pluralizar(grupo.registros.length, 'leitura')}</StatusBadge>
        {semContexto > 0 ? <StatusBadge tone="pending">{semContexto} sem contexto</StatusBadge> : null}
      </div>

      {emRajada ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {pluralizar(emRajada.leituras, 'leitura')} em {pluralizar(emRajada.minutos, 'minuto')} — padrão de revisão de
          fila. Fica visível para virar pergunta, não acusação.
        </span>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {grupo.registros.map((r, i) => (
          <LinhaDeAcesso key={r.id} registro={r} agrupamento={agrupamento} primeira={i === 0} />
        ))}
      </div>
    </Cartao>
  );
}
