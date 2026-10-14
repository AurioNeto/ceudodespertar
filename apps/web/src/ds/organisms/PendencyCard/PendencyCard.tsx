import { useId } from 'react';
import { Icon } from '../../atoms/Icon';
import { rotuloVersalete } from '../../fundacao/estilos';
import { AnswerBlock } from './components/AnswerBlock';
import { RoleAction } from './components/RoleAction';
import type { PendencyCardProps } from './tipos';

function hasAnswer(answer: string | undefined): answer is string {
  return Boolean(answer?.trim());
}

export function PendencyCard(props: PendencyCardProps) {
  const { pendencyId, question, askedBy, askedAt, answer, texts, style } = props;
  const headingId = useId();
  const answered = hasAnswer(answer);

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: 'var(--leaf-md)',
        padding: '14px 16px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
        <Icon name="message-circle-question" size={17} color="var(--color-attention)" />
        <span
          id={headingId}
          style={{
            ...rotuloVersalete,
            color: 'var(--color-attention)',
          }}
        >
          {answered ? texts.answeredHeading : texts.openHeading}
        </span>
      </div>

      <p style={{ font: 'var(--text-body-lg)', color: 'var(--text-primary)' }}>{question}</p>
      <p style={{ marginTop: 6, font: '500 12px var(--font-data)', color: 'var(--text-meta)' }}>
        {askedBy}
        {askedAt ? ` · ${askedAt}` : ''}
      </p>

      {answered ? <AnswerBlock label={texts.answerLabel} answer={answer} /> : null}
      <RoleAction key={pendencyId} pendency={props} answered={answered} />
    </div>
  );
}
