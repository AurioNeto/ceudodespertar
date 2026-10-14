import { Button } from '../../../../../../atoms/Button';
import { TextField } from '../../../../../../molecules/TextField';
import type { AddresseeTexts } from '../../../../tipos';
import { useDraftForm } from './hooks/useDraftForm';

export interface DraftFormProps {
  texts: AddresseeTexts;
  onAnswer: (answer: string) => void;
}

export function DraftForm({ texts, onAnswer }: DraftFormProps) {
  const { rascunho, setRascunho, formulario, resposta, entregar } = useDraftForm(onAnswer);

  return (
    <div ref={formulario} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <TextField
        label={texts.draftLabel}
        multiline
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        placeholder={texts.draftPlaceholder}
      />
      <Button
        density="field"
        fullWidth
        iconName="send"
        disabled={resposta === ''}
        blockedReason={texts.emptyDraftReason}
        onClick={entregar}
      >
        {texts.submitLabel}
      </Button>
    </div>
  );
}
