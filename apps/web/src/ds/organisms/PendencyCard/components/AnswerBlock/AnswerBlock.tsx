import { rotuloVersalete, vidroLeve } from '../../../../fundacao/estilos';

export interface AnswerBlockProps {
  label: string;
  answer: string;
}

export function AnswerBlock({ label, answer }: AnswerBlockProps) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--bg-card)',
        ...vidroLeve,
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-sm)',
        padding: '10px 12px',
      }}
    >
      <span
        style={{
          display: 'block',
          ...rotuloVersalete,
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <p style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{answer}</p>
    </div>
  );
}
