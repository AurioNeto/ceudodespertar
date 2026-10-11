import { Button, Icon, Select, TextField } from '@/ds';
import type { LoteDeDaime } from '../../mocks/ayahuasca';
import type { RascunhoDeMovimento } from '../../tipos';
import { litros } from '../../utils/litros';

export interface ModalDeMovimentoProps {
  form: RascunhoDeMovimento;
  erro: string | null;
  lotes: readonly LoteDeDaime[];
  onMudar: (f: RascunhoDeMovimento) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}

export function ModalDeMovimento({ form, erro, lotes, onMudar, onCancelar, onSalvar }: ModalDeMovimentoProps) {
  const titulo =
    form.modo === 'feitio' ? 'Entrada de feitio' : form.modo === 'saida' ? 'Registrar saída' : 'Transferir para outra unidade';

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,24,0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{titulo}</span>
          <button type="button" onClick={onCancelar} aria-label="fechar" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.modo === 'feitio' ? (
            <>
              <TextField
                label="Código do lote"
                value={form.codigo}
                onChange={(e) => onMudar({ ...form, codigo: e.target.value })}
                placeholder="Lote 12/2026"
              />
              <TextField
                label="Origem"
                value={form.origem}
                onChange={(e) => onMudar({ ...form, origem: e.target.value })}
                placeholder="Feitio de dezembro · CDD"
              />
              <Select
                label="Força"
                value={form.forca}
                options={['Força 1', 'Força 2', 'Força 3'].map((f) => ({ value: f, label: f }))}
                onChange={(v) => onMudar({ ...form, forca: v })}
              />
            </>
          ) : (
            <>
              <Select
                label="Lote"
                value={form.loteId}
                options={lotes.map((l) => ({ value: String(l.id), label: `${l.codigo} · ${litros(l.restante)}` }))}
                onChange={(v) => onMudar({ ...form, loteId: v })}
              />
              <TextField
                label={form.modo === 'saida' ? 'Trabalho' : 'Unidade de destino'}
                value={form.destino}
                onChange={(e) => onMudar({ ...form, destino: e.target.value })}
                placeholder={form.modo === 'saida' ? 'Mãe Divina · setembro' : 'Céu do Vale'}
              />
            </>
          )}

          <TextField
            label="Litros"
            value={form.litros}
            onChange={(e) => onMudar({ ...form, litros: e.target.value })}
            inputMode="decimal"
            placeholder="9"
          />

          {erro ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--color-attention-soft)',
                border: '1px solid var(--color-attention-border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
              }}
            >
              <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{erro}</span>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            padding: '12px 20px 16px',
            borderTop: 'var(--border-hairline)',
            alignItems: 'flex-start',
          }}
        >
          <Button variant="quiet" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button iconName="check" disabled={!!erro} blockedReason={erro ?? undefined} onClick={onSalvar}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
