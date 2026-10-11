import { Aviso, Button, PainelDeAcao, Select, TextField } from '@/ds';
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
    <PainelDeAcao aberto titulo={titulo} variante="central" aoFechar={onCancelar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

        {erro ? <Aviso tom="atencao">{erro}</Aviso> : null}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'flex-start' }}>
          <Button variant="quiet" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button iconName="check" disabled={!!erro} blockedReason={erro ?? undefined} onClick={onSalvar}>
            Salvar
          </Button>
        </div>
      </div>
    </PainelDeAcao>
  );
}
