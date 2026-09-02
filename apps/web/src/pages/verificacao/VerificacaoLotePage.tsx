import { useState } from 'react';
import type { ItemNaFila, LancamentoId, OrigemCaptura } from '@cdd/contracts';
import { Button, EmptyState, Icon, ScreenHeader, StatusBadge, type IconName } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import { CONFIANCA, ORIGENS, filaDeVerificacaoInicial } from '../../mocks/verificacao';
import { PainelDeRevisao } from './PainelDeRevisao';

type FiltroOrigem = OrigemCaptura | 'TODAS';

const FILTROS: readonly { valor: FiltroOrigem; label: string }[] = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'COMPROVANTE', label: 'Comprovantes' },
  { valor: 'EXTRATO', label: 'Extrato' },
  { valor: 'REGISTRO_RAPIDO', label: 'Registro rápido' },
];

export function VerificacaoLotePage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const [itens, setItens] = useState<readonly ItemNaFila[]>(filaDeVerificacaoInicial);
  const [filtro, setFiltro] = useState<FiltroOrigem>('TODAS');
  const [selecionados, setSelecionados] = useState<readonly LancamentoId[]>([]);
  const [emRevisao, setEmRevisao] = useState<ItemNaFila | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const visiveis = filtro === 'TODAS' ? itens : itens.filter((i) => i.origem === filtro);
  const todosSelecionados = visiveis.length > 0 && visiveis.every((i) => selecionados.includes(i.id));
  const deAltaConfianca = itens.filter((i) => i.confianca === 'ALTA');

  const remover = (ids: readonly LancamentoId[]) => {
    setItens((lista) => lista.filter((i) => !ids.includes(i.id)));
    setSelecionados((s) => s.filter((x) => !ids.includes(x)));
  };

  const aprovarSelecionados = () => {
    const n = selecionados.length;
    remover(selecionados);
    setMensagem(`${pluralizar(n, 'lançamento aprovado', 'lançamentos aprovados')} e consolidado${n > 1 ? 's' : ''}.`);
  };

  const aprovarAltaConfianca = () => {
    const ids = deAltaConfianca.map((i) => i.id);
    remover(ids);
    setMensagem(
      `${pluralizar(ids.length, 'lançamento', 'lançamentos')} de alta confiança aprovado${ids.length === 1 ? '' : 's'}.`,
    );
  };

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
        {mensagem ? (
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
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{mensagem}</span>
            <button
              type="button"
              aria-label="fechar aviso"
              onClick={() => setMensagem(null)}
              style={{ color: 'var(--color-royal-deep)', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {FILTROS.map((f) => {
            const on = filtro === f.valor;
            const quantos = f.valor === 'TODAS' ? itens.length : itens.filter((i) => i.origem === f.valor).length;
            return (
              <button
                key={f.valor}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(f.valor)}
                style={{
                  font: 'var(--text-small)',
                  padding: '8px 14px',
                  minHeight: 38,
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                  background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                }}
              >
                {f.label} ({quantos})
              </button>
            );
          })}
          {campo ? null : (
            <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {pluralizar(visiveis.length, 'item na fila', 'itens na fila')}
            </span>
          )}
        </div>

        {selecionados.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              background: 'var(--bg-brand)',
              border: '1px solid var(--border-brand)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {pluralizar(selecionados.length, 'selecionado', 'selecionados')}
            </span>
            <Button variant="quiet" iconName="check-check" onClick={aprovarSelecionados}>
              Aprovar selecionados
            </Button>
            <button
              type="button"
              onClick={() => setSelecionados([])}
              style={{
                marginLeft: 'auto',
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpar seleção
            </button>
          </div>
        ) : null}

        {itens.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={todosSelecionados}
                onChange={() =>
                  setSelecionados(todosSelecionados ? [] : visiveis.map((i) => i.id))
                }
                style={{ width: 17, height: 17, cursor: 'pointer' }}
              />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                Selecionar todos visíveis
              </span>
            </label>
            <button
              type="button"
              onClick={aprovarAltaConfianca}
              disabled={deAltaConfianca.length === 0}
              style={{
                marginLeft: 'auto',
                font: 'var(--text-small)',
                padding: '7px 13px',
                borderRadius: 'var(--radius-sm)',
                cursor: deAltaConfianca.length ? 'pointer' : 'not-allowed',
                border: '1px solid var(--color-confirmed)',
                background: 'var(--bg-card)',
                color: 'var(--color-confirmed)',
                opacity: deAltaConfianca.length ? 1 : 0.5,
              }}
            >
              Aprovar todos de alta confiança ({deAltaConfianca.length})
            </button>
          </div>
        ) : null}

        {visiveis.length === 0 ? (
          <EmptyState
            title="Nada nessa fila"
            description="Tudo que chegou pela captura automática já foi conferido."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visiveis.map((item) => (
              <LinhaDaFila
                key={item.id}
                item={item}
                campo={campo}
                selecionado={selecionados.includes(item.id)}
                onSelecionar={() =>
                  setSelecionados((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]))
                }
                onAbrir={() => setEmRevisao(item)}
              />
            ))}
          </div>
        )}
      </div>

      {emRevisao ? (
        <PainelDeRevisao
          item={emRevisao}
          campo={campo}
          onFechar={() => setEmRevisao(null)}
          onAprovar={(corrigido) => {
            remover([corrigido.id]);
            setEmRevisao(null);
            setMensagem('Lançamento aprovado e consolidado.');
          }}
          onDevolver={(motivo) => {
            const quem = emRevisao.remetente ?? 'quem enviou';
            remover([emRevisao.id]);
            setEmRevisao(null);
            setMensagem(`Devolvido a ${quem}: ${motivo}`);
          }}
        />
      ) : null}
    </div>
  );
}

function LinhaDaFila({
  item,
  campo,
  selecionado,
  onSelecionar,
  onAbrir,
}: {
  item: ItemNaFila;
  campo: boolean;
  selecionado: boolean;
  onSelecionar: () => void;
  onAbrir: () => void;
}) {
  const origem = ORIGENS[item.origem];
  const confianca = CONFIANCA[item.confianca];
  const meta = [
    formatarData(item.data),
    origem.label,
    item.remetente ?? 'importado',
    item.tipo === 'TRANSFERENCIA' ? `${item.conta} → ${item.contaDestino}` : (item.categoria ?? 'sem categoria'),
  ].join(' · ');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: campo ? 'wrap' : 'nowrap',
        background: selecionado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${selecionado ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: '11px 14px',
      }}
    >
      <input
        type="checkbox"
        checked={selecionado}
        onChange={onSelecionar}
        aria-label={`selecionar ${item.motivo}`}
        style={{ width: 17, height: 17, cursor: 'pointer', flex: '0 0 auto' }}
      />
      <Icon name={origem.icone as IconName} size={18} color="var(--color-royal)" />
      <button
        type="button"
        onClick={onAbrir}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            font: 'var(--text-body-strong)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.motivo}
        </span>
        <span
          style={{
            font: 'var(--text-small)',
            color: 'var(--text-meta)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta}
        </span>
      </button>
      <StatusBadge tone={confianca.tone}>{confianca.texto}</StatusBadge>
      <span
        style={{
          font: 'var(--text-amount)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: item.tipo === 'ENTRADA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        {item.tipo === 'ENTRADA' ? '+ ' : item.tipo === 'SAIDA' ? '− ' : ''}
        {formatarDinheiro(item.valor)}
      </span>
      <Button variant="ghost" onClick={onAbrir}>
        Revisar
      </Button>
    </div>
  );
}
