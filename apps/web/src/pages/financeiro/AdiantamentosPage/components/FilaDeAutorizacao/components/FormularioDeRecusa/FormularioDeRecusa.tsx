import { Button, TextField } from '@/ds';

export interface FormularioDeRecusaProps {
  motivo: string;
  onMotivo: (v: string) => void;
  onRecusar: () => void;
  onVoltar: () => void;
}

export function FormularioDeRecusa({ motivo, onMotivo, onRecusar, onVoltar }: FormularioDeRecusaProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%' }}>
      <TextField
        label="Motivo da recusa"
        value={motivo}
        onChange={(e) => onMotivo(e.target.value)}
        placeholder="o que impede de autorizar"
        style={{ flex: 1, minWidth: 240 }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 24 }}>
        <Button
          iconName="check"
          onClick={onRecusar}
          disabled={!motivo.trim()}
          blockedReason={!motivo.trim() ? 'A recusa exige um motivo escrito.' : undefined}
        >
          Recusar
        </Button>
        <Button variant="quiet" onClick={onVoltar}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
