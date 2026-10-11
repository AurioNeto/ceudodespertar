import { DefaultField, Interruptor } from '@/ds';
import type { FormularioDeLancamento } from '../../../../tipos';

export interface ReembolsoProps {
  formulario: FormularioDeLancamento;
}

export function Reembolso({ formulario: f }: ReembolsoProps) {
  return (
    <>
      {f.temReembolso ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Reembolso a uma pessoa</div>
            <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {f.campos.reembolso
                ? `Vira conta a pagar para ${f.campos.pessoa} — sai do saldo só quando for paga.`
                : 'Alguém do corpo adiantou do próprio bolso?'}
            </div>
          </div>
          <Interruptor
            ligado={f.campos.reembolso}
            onAlternar={() => f.alterar('reembolso', !f.campos.reembolso)}
            rotuloAcessivel="Reembolso a uma pessoa"
          />
        </div>
      ) : null}

      {f.campos.reembolso ? (
        <DefaultField
          label="Quem adiantou o dinheiro"
          value={f.campos.pessoa}
          origin="vira conta a pagar"
          density="office"
          onEdit={() => f.abrirPicker('pessoa')}
        />
      ) : null}
    </>
  );
}
