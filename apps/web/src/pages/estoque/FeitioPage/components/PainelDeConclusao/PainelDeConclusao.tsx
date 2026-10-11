import { Button, Cartao, Rotulo, TextField, type Density } from '@/ds';
import { formatarBRL, formatarLitros } from '@/pages/utils/formato';

export interface PainelDeConclusaoProps {
  densidade: Density;
  litros: string;
  forca: string;
  dataFim: string;
  total: number;
  onLitros: (v: string) => void;
  onForca: (v: string) => void;
  onDataFim: (v: string) => void;
  onCancelar: () => void;
  onConcluir: () => void;
}

export function PainelDeConclusao({
  densidade,
  litros,
  forca,
  dataFim,
  total,
  onLitros,
  onForca,
  onDataFim,
  onCancelar,
  onConcluir,
}: PainelDeConclusaoProps) {
  const campo = densidade === 'field';
  const litrosNum = Number(litros.replace(',', '.')) || 0;
  const porLitro = litrosNum > 0 ? total / litrosNum : null;

  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      <Rotulo>Quanto saiu da panela</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        <TextField
          label="Litros produzidos"
          placeholder="0,0"
          inputMode="decimal"
          value={litros}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onLitros(e.target.value)}
        />
        <TextField
          label="Força"
          value={forca}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onForca(e.target.value)}
          hint="Vai junto com o lote, para a vida toda."
        />
        <TextField
          label="Data de encerramento"
          value={dataFim}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onDataFim(e.target.value)}
        />
      </div>

      {porLitro !== null ? (
        <div
          style={{
            background: 'var(--bg-sunken)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px 12px',
            alignItems: 'baseline',
          }}
        >
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
            {formatarBRL(total)} em {formatarLitros(litrosNum)} L
          </span>
          <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
            {formatarBRL(porLitro)}/L
          </span>
        </div>
      ) : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Concluir gera <b>um lote</b> — nem zero nem dois — com a força que você escrever, e fecha o feitio para novos
        consumos. A partir daqui a folha que faltou entra no próximo, não neste.
      </span>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button
          iconName="check"
          density={campo ? 'field' : 'office'}
          disabled={litrosNum <= 0 || !forca.trim() || !dataFim.trim()}
          blockedReason={
            litrosNum <= 0
              ? 'Quantos litros saíram? Sem isso não há lote nem custo por litro.'
              : !forca.trim()
                ? 'A força vai no lote e acompanha o sacramento até o fim.'
                : !dataFim.trim()
                  ? 'Concluir exige a data de encerramento.'
                  : undefined
          }
          onClick={onConcluir}
        >
          Concluir e criar o lote
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Cartao>
  );
}
