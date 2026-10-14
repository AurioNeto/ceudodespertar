import { Button } from '../../../../../../atoms/Button';
import { useReopenAction } from './hooks/useReopenAction';

export interface ReopenActionProps {
  label: string;
  onReopen: () => void;
}

export function ReopenAction({ label, onReopen }: ReopenActionProps) {
  const { requested, reopen } = useReopenAction(onReopen);

  return (
    <div style={{ marginTop: 12 }}>
      <Button variant="quiet" iconName="rotate-ccw" disabled={requested} onClick={reopen}>
        {label}
      </Button>
    </div>
  );
}
