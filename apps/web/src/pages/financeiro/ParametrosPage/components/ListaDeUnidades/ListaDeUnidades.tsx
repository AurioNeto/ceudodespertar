import type { UnidadeDoPlano } from '@cdd/contracts';
import type { Density } from '@/ds';
import { UnidadeCartao } from './components/UnidadeCartao';

export function ListaDeUnidades({
  unidades,
  densidade,
}: {
  unidades: readonly UnidadeDoPlano[];
  densidade: Density;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {unidades.map((u) => (
        <UnidadeCartao key={u.id} unidade={u} densidade={densidade} />
      ))}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Unidade é <b>centro de custo</b>, não fronteira de segurança. Quem isola dados é a instituição; a unidade só
        organiza o relatório e decide o vocabulário da tela.
      </span>
    </div>
  );
}
