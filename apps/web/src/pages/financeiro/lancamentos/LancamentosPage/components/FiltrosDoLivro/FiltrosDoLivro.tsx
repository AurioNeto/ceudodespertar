import { Button, Rotulo, Select, type Density, vidroLeve } from '@/ds';
import { ChipDeFiltro } from '@/pages/financeiro/lancamentos/components/ChipDeFiltro';
import { CHIPS_TIPO, OPCOES_GRUPO, OPCOES_PERIODO, OPCOES_STATUS, OPCOES_TIPO } from '../../constantes';

export interface FiltrosDoLivroProps {
  filtros: Record<string, string>;
  densidade: Density;
  onFiltrar: (campoFiltro: string, valor: string) => void;
  onLimpar: () => void;
}

export function FiltrosDoLivro({ filtros, densidade, onFiltrar, onLimpar }: FiltrosDoLivroProps) {
  const campo = densidade === 'field';

  return campo ? (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {CHIPS_TIPO.map((c) => (
        <ChipDeFiltro
          key={c.value}
          ativo={filtros.tipo === c.value}
          tamanho="amplo"
          onEscolher={() => onFiltrar('tipo', c.value)}
        >
          {c.label}
        </ChipDeFiltro>
      ))}
    </div>
  ) : (
    <div
      style={{
        background: 'var(--bg-card)',
        ...vidroLeve,
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-lg)',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
        gap: 14,
        alignItems: 'end',
      }}
    >
      <Select
        label="Período"
        value={filtros.periodo ?? 'todos'}
        options={OPCOES_PERIODO}
        onChange={(v) => onFiltrar('periodo', v)}
      />
      <Select
        label="Tipo"
        value={filtros.tipo ?? 'todos'}
        options={OPCOES_TIPO}
        onChange={(v) => onFiltrar('tipo', v)}
      />
      <Select
        label="Grupo"
        value={filtros.grupo ?? 'todos'}
        options={OPCOES_GRUPO}
        onChange={(v) => onFiltrar('grupo', v)}
      />
      <Select
        label="Situação"
        value={filtros.status ?? 'todos'}
        options={OPCOES_STATUS}
        onChange={(v) => onFiltrar('status', v)}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Rotulo style={{ marginBottom: 7 }}>Busca</Rotulo>
        <input
          value={filtros.busca ?? ''}
          onChange={(e) => onFiltrar('busca', e.target.value)}
          placeholder="motivo, fornecedor ou quem lançou"
          aria-label="Buscar por motivo, fornecedor ou quem lançou"
          style={{
            minHeight: 'var(--target-office)',
            border: '1px solid var(--border-field)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--leaf-sm)',
            padding: '10px 13px',
            font: 'var(--text-body)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>
      <Button variant="quiet" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  );
}
