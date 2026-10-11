import { EmptyState, Select, Rotulo, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { FEICAO, TODOS } from '../../constantes';
import { rotularDia } from '../../utils/instante';
import { LinhaDaTrilha } from './components/LinhaDaTrilha';
import { NotaDeImutabilidade } from './components/NotaDeImutabilidade';
import { RodapeDaTrilha } from './components/RodapeDaTrilha';
import { useFiltrosDaTrilha } from './hooks/useFiltrosDaTrilha';

export interface TrilhaProps {
  densidade: Density;
}

export function Trilha({ densidade }: TrilhaProps) {
  const campo = densidade === 'field';
  const { operacao, setOperacao, autor, setAutor, autores, operacoesPresentes, filtrada, total, porDia } =
    useFiltrosDaTrilha();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      <NotaDeImutabilidade />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) auto',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <Select
          label="Operação"
          value={operacao}
          onChange={setOperacao}
          options={[
            { value: TODOS, label: 'Todas as operações' },
            ...operacoesPresentes.map((o) => ({ value: o, label: FEICAO[o].rotulo })),
          ]}
        />
        <Select
          label="Quem fez"
          value={autor}
          onChange={setAutor}
          options={[{ value: TODOS, label: 'Qualquer pessoa' }, ...autores.map((a) => ({ value: a, label: a }))]}
        />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', paddingBottom: 11 }}>
          {pluralizar(filtrada.length, 'registro')}
          {filtrada.length === total ? '' : ` de ${total}`}
        </span>
      </div>

      {porDia.length === 0 ? (
        <EmptyState
          title="Nada com esse recorte"
          description="A trilha não tem lacuna: se não há registro aqui, é o filtro que está estreito demais."
        />
      ) : (
        porDia.map(([data, registros]) => (
          <div key={data} style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <Rotulo>{rotularDia(data)}</Rotulo>
              <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
            </div>
            {registros.map((r) => (
              <LinhaDaTrilha key={r.id} registro={r} densidade={densidade} />
            ))}
          </div>
        ))
      )}

      <RodapeDaTrilha />
    </div>
  );
}
