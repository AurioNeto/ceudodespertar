import { useState } from 'react';
import { Button, Icon, Select, type Density } from '@/ds';
import type { Comparacao, Filtros, useRelatorio } from '../../hooks/useRelatorio';
import { CATEGORIAS_DE_ENTRADA, CATEGORIAS_DE_SAIDA, CERIMONIAS, CONTAS, GRUPOS } from '../../mocks/relatorios';
import { CampoDeMes } from './components/CampoDeMes';
import { Chip } from './components/Chip';
import { PERIODOS } from './constantes';
import { comOpcaoTodos } from './utils/comOpcaoTodos';

export interface PainelDeFiltrosProps {
  relatorio: ReturnType<typeof useRelatorio>;
  resumoDoRecorte: string;
  densidade: Density;
}

export function PainelDeFiltros({ relatorio: r, resumoDoRecorte, densidade }: PainelDeFiltrosProps) {
  const campo = densidade === 'field';
  const [filtrosAbertos, setFiltrosAbertos] = useState(!campo);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? '12px 14px' : '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: filtrosAbertos ? 14 : 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setFiltrosAbertos((a) => !a)}
          aria-expanded={filtrosAbertos}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            font: 'var(--text-body-strong)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <Icon name={filtrosAbertos ? 'chevron-down' : 'chevron-right'} size={16} color="var(--color-royal)" />
          {filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        {filtrosAbertos ? null : (
          <span
            style={{
              font: 'var(--text-small)',
              color: 'var(--text-secondary)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {resumoDoRecorte}
          </span>
        )}
      </div>

      {filtrosAbertos ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {PERIODOS.map((p) => (
              <Chip key={p.valor} ativo={r.periodo === p.valor} onClick={() => r.setPeriodo(p.valor)}>
                {p.label}
              </Chip>
            ))}
            <span style={{ width: 1, height: 24, background: 'var(--color-line)' }} />
            {(['CDD', 'Munay'] as const).map((u) => (
              <Chip key={u} ativo={r.unidades.includes(u)} onClick={() => r.alternarUnidade(u)}>
                {u}
              </Chip>
            ))}
          </div>

          {r.periodo === 'personalizado' ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <CampoDeMes rotulo="De" valor={r.de} onMudar={r.setDe} />
              <CampoDeMes rotulo="Até" valor={r.ate} onMudar={r.setAte} />
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(auto-fit,minmax(170px,1fr))',
              gap: 12,
            }}
          >
            <Select
              label="Comparar com"
              value={r.comparar}
              options={[
                { value: 'anterior', label: 'Período anterior' },
                { value: 'ano_passado', label: 'Mesmo período do ano passado' },
                { value: 'nenhum', label: 'Sem comparação' },
              ]}
              onChange={(v) => r.setComparar(v as Comparacao)}
            />
            <Select
              label="Grupo"
              value={r.filtros.grupo}
              options={comOpcaoTodos(['todos', 'Todos'], GRUPOS)}
              onChange={(v) => r.setFiltro('grupo', v)}
            />
            <Select
              label="Categoria"
              value={r.filtros.categoria}
              options={comOpcaoTodos(['todas', 'Todas'], [...CATEGORIAS_DE_SAIDA, ...CATEGORIAS_DE_ENTRADA])}
              onChange={(v) => r.setFiltro('categoria', v)}
            />
            <Select
              label="Conta"
              value={r.filtros.conta}
              options={comOpcaoTodos(['todas', 'Todas'], CONTAS)}
              onChange={(v) => r.setFiltro('conta', v)}
            />
            <Select
              label="Tipo"
              value={r.filtros.tipo}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'saida', label: 'Saída' },
                { value: 'entrada', label: 'Entrada' },
                { value: 'transferencia', label: 'Transferência' },
              ]}
              onChange={(v) => r.setFiltro('tipo', v)}
            />
            <Select
              label="Cerimônia"
              value={r.filtros.cerimonia}
              options={comOpcaoTodos(['todas', 'Todas'], CERIMONIAS)}
              onChange={(v) => r.setFiltro('cerimonia', v)}
            />
            <Select
              label="Situação"
              value={r.filtros.situacao}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'consolidado', label: 'Consolidado' },
                { value: 'a conferir', label: 'A conferir' },
              ]}
              onChange={(v) => r.setFiltro('situacao', v as Filtros['situacao'])}
            />
          </div>

          <Button variant="quiet" onClick={r.limparFiltros} style={{ alignSelf: 'flex-start' }}>
            Limpar filtros
          </Button>
        </>
      ) : null}
    </div>
  );
}
