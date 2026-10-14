import { Aviso, CorpoDaTela, EmptyState, ScreenHeader, useDensidade, vidroLeve } from '@/ds';
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
        title="Verificação de lote"
        subtitle={
          campo
            ? undefined
            : 'O que a captura automática propôs, esperando uma pessoa confirmar · só Tesouraria e administradores'
        }
        density={densidade}
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1020}>
        {fila.mensagem ? (
          <Aviso tom="informacao" aoFechar={fila.fecharAviso} rotuloDeFechar="fechar aviso">
            {fila.mensagem}
          </Aviso>
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
                borderRadius: 'var(--leaf-md)',
                cursor: fila.deAltaConfianca.length ? 'pointer' : 'not-allowed',
                border: '1px solid var(--color-confirmed)',
                background: 'var(--bg-card)',
                ...vidroLeve,
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
      </CorpoDaTela>

      {fila.emRevisao ? (
        <PainelDeRevisao
          item={fila.emRevisao}
          densidade={densidade}
          onFechar={fila.fecharRevisao}
          onAprovar={fila.aprovarRevisado}
          onDevolver={fila.devolverEmRevisao}
        />
      ) : null}
    </div>
  );
}
