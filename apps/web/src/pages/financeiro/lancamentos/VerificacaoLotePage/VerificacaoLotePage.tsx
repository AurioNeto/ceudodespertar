import { EmptyState, Icon, ScreenHeader, useDensidade } from '@/ds';
import { PainelDeRevisao } from './components/PainelDeRevisao';
import { BarraDeSelecao } from './components/BarraDeSelecao';
import { FiltrosDeOrigem } from './components/FiltrosDeOrigem';
import { LinhaDaFila } from './components/LinhaDaFila';
import { useFilaDeVerificacao } from './hooks/useFilaDeVerificacao';

export function VerificacaoLotePage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const fila = useFilaDeVerificacao();

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-05' : 'F-05 · Verificação de lote'}
        title="Verificação de lote"
        subtitle={
          campo
            ? undefined
            : 'O que a captura automática propôs, esperando uma pessoa confirmar · só Tesouraria e administradores'
        }
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 22px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: campo ? undefined : 1020,
        }}
      >
        {fila.mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{fila.mensagem}</span>
            <button
              type="button"
              aria-label="fechar aviso"
              onClick={fila.fecharAviso}
              style={{ color: 'var(--color-royal-deep)', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <FiltrosDeOrigem
          itens={fila.itens}
          filtro={fila.filtro}
          totalVisiveis={fila.visiveis.length}
          densidade={densidade}
          onEscolher={fila.escolherFiltro}
        />

        {fila.selecionados.length > 0 ? (
          <BarraDeSelecao
            quantidade={fila.selecionados.length}
            onAprovar={fila.aprovarSelecionados}
            onLimpar={fila.limparSelecao}
          />
        ) : null}

        {fila.itens.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fila.todosSelecionados}
                onChange={fila.alternarTodosVisiveis}
                style={{ width: 17, height: 17, cursor: 'pointer' }}
              />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                Selecionar todos visíveis
              </span>
            </label>
            <button
              type="button"
              onClick={fila.aprovarAltaConfianca}
              disabled={fila.deAltaConfianca.length === 0}
              style={{
                marginLeft: 'auto',
                font: 'var(--text-small)',
                padding: '7px 13px',
                borderRadius: 'var(--radius-sm)',
                cursor: fila.deAltaConfianca.length ? 'pointer' : 'not-allowed',
                border: '1px solid var(--color-confirmed)',
                background: 'var(--bg-card)',
                color: 'var(--color-confirmed)',
                opacity: fila.deAltaConfianca.length ? 1 : 0.5,
              }}
            >
              Aprovar todos de alta confiança ({fila.deAltaConfianca.length})
            </button>
          </div>
        ) : null}

        {fila.visiveis.length === 0 ? (
          <EmptyState
            title="Nada nessa fila"
            description="Tudo que chegou pela captura automática já foi conferido."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fila.visiveis.map((item) => (
              <LinhaDaFila
                key={item.id}
                item={item}
                densidade={densidade}
                selecionado={fila.selecionados.includes(item.id)}
                onSelecionar={() => fila.alternarSelecao(item.id)}
                onAbrir={() => fila.abrirRevisao(item)}
              />
            ))}
          </div>
        )}
      </div>

      {fila.emRevisao ? (
        <PainelDeRevisao
          item={fila.emRevisao}
          campo={campo}
          onFechar={fila.fecharRevisao}
          onAprovar={fila.aprovarRevisado}
          onDevolver={fila.devolverEmRevisao}
        />
      ) : null}
    </div>
  );
}
