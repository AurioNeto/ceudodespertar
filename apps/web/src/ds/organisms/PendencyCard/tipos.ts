import type { CSSProperties } from 'react';

export interface PendencyTexts {
  openHeading: string;
  answeredHeading: string;
  answerLabel: string;
}

export interface AddresseeTexts extends PendencyTexts {
  draftLabel: string;
  draftPlaceholder: string;
  submitLabel: string;
  emptyDraftReason: string;
}

export interface ReviewerTexts extends PendencyTexts {
  reviewerReason: string;
  reopenLabel: string;
}

export interface PendencyBaseProps {
  pendencyId: string;
  question: string;
  askedBy: string;
  askedAt?: string;
  answer?: string;
  style?: CSSProperties;
}

export interface AddresseePendencyProps extends PendencyBaseProps {
  role: 'addressee';
  texts: AddresseeTexts;
  onAnswer: (answer: string) => void;
}

export interface ReviewerPendencyProps extends PendencyBaseProps {
  role: 'reviewer';
  texts: ReviewerTexts;
  onReopen: () => void;
}

export interface ObserverPendencyProps extends PendencyBaseProps {
  role: 'observer';
  texts: PendencyTexts;
}

export type PendencyCardProps = AddresseePendencyProps | ReviewerPendencyProps | ObserverPendencyProps;

export type PendencyRole = PendencyCardProps['role'];
