import type { PendencyCardProps } from '../../tipos';
import { DraftForm } from './components/DraftForm';
import { ReopenAction } from './components/ReopenAction';

export interface RoleActionProps {
  pendency: PendencyCardProps;
  answered: boolean;
}

export function RoleAction({ pendency, answered }: RoleActionProps) {
  if (pendency.role === 'addressee') {
    return answered ? null : <DraftForm texts={pendency.texts} onAnswer={pendency.onAnswer} />;
  }

  if (pendency.role === 'reviewer') {
    return answered ? (
      <ReopenAction key={pendency.answer} label={pendency.texts.reopenLabel} onReopen={pendency.onReopen} />
    ) : (
      <p style={{ marginTop: 12, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {pendency.texts.reviewerReason}
      </p>
    );
  }

  return null;
}
