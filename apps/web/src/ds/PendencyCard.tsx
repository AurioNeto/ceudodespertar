import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { TextField } from './TextField';

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

interface PendencyBaseProps {
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

export function PendencyCard(props: PendencyCardProps) {
  const { question, askedBy, askedAt, answer, texts, style } = props;
  const headingId = useId();

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '14px 16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
        <Icon name="message-circle-question" size={17} color="var(--color-attention)" />
        <span
          id={headingId}
          style={{
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-attention)',
          }}
        >
          {answer ? texts.answeredHeading : texts.openHeading}
        </span>
      </div>

      <p style={{ font: 'var(--text-body-lg)', color: 'var(--text-primary)' }}>{question}</p>
      <p style={{ marginTop: 6, font: '500 12px var(--font-data)', color: 'var(--text-meta)' }}>
        {askedBy}
        {askedAt ? ` · ${askedAt}` : ''}
      </p>

      {answer ? <AnswerBlock label={texts.answerLabel} answer={answer} /> : null}
      <RoleAction pendency={props} />
    </div>
  );
}

interface AnswerBlockProps {
  label: string;
  answer: string;
}

function AnswerBlock({ label, answer }: AnswerBlockProps) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
      }}
    >
      <span
        style={{
          display: 'block',
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-field-label)',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <p style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{answer}</p>
    </div>
  );
}

interface RoleActionProps {
  pendency: PendencyCardProps;
}

function RoleAction({ pendency }: RoleActionProps) {
  const answered = Boolean(pendency.answer);

  if (pendency.role === 'addressee') {
    return answered ? null : (
      <DraftForm key={pendency.question} texts={pendency.texts} onAnswer={pendency.onAnswer} />
    );
  }

  if (pendency.role === 'reviewer') {
    return answered ? (
      <div style={{ marginTop: 12 }}>
        <Button variant="quiet" iconName="rotate-ccw" onClick={() => pendency.onReopen()}>
          {pendency.texts.reopenLabel}
        </Button>
      </div>
    ) : (
      <p style={{ marginTop: 12, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {pendency.texts.reviewerReason}
      </p>
    );
  }

  return null;
}

interface DraftFormProps {
  texts: AddresseeTexts;
  onAnswer: (answer: string) => void;
}

function DraftForm({ texts, onAnswer }: DraftFormProps) {
  const [rascunho, setRascunho] = useState('');
  const resposta = rascunho.trim();

  function entregar() {
    onAnswer(resposta);
    setRascunho('');
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
