import type { LancamentoNaLista } from '@cdd/contracts';

export interface PontosDoCarrosselProps {
  registros: readonly LancamentoNaLista[];
  indice: number;
  onIrPara: (indice: number) => void;
}

export function PontosDoCarrossel({ registros, indice, onIrPara }: PontosDoCarrosselProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {registros.map((r, i) => (
        <button
          key={r.id}
          type="button"
          aria-label={`ir para o registro ${i + 1}`}
          onClick={() => onIrPara(i)}
          style={{
            width: i === indice ? 26 : 9,
            height: 9,
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            padding: 0,
            background: i === indice ? 'var(--color-royal)' : 'var(--color-line-strong)',
            transition: 'width var(--motion-fast)',
          }}
        />
      ))}
    </div>
  );
}
