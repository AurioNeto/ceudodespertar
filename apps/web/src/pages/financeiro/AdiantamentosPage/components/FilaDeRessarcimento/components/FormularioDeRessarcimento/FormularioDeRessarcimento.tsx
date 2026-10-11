import { Button, Select, TextField } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { contasInstitucionais } from '../../../../mocks/adiantamentos';

export interface FormularioDeRessarcimentoProps {
  conta: string;
  data: string;
  valor: number;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onConfirmar: () => void;
  onVoltar: () => void;
}

export function FormularioDeRessarcimento({
  conta,
  data,
  valor,
  onConta,
  onData,
  onConfirmar,
  onVoltar,
}: FormularioDeRessarcimentoProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%' }}>
      <Select
        label="Conta de saída"
        value={conta}
        options={contasInstitucionais.map((c) => ({ value: c.id, label: c.nome }))}
        onChange={onConta}
      />
      <TextField label="Data" type="date" value={data} onChange={(e) => onData(e.target.value)} />
      <TextField label="Valor" value={formatarDinheiro(valor)} readOnly hint="igual ao adiantado" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 24 }}>
        <Button iconName="check" onClick={onConfirmar}>
          Confirmar
        </Button>
        <Button variant="quiet" onClick={onVoltar}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
