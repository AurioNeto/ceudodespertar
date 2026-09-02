import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { TextField } from './TextField';

export interface PendencyCardProps {
  question: string;
  askedBy: string;
  askedAt?: string;
  answer?: string;
  /**
   * A pergunta é de quem registrou. Para quem conferiu, o campo de resposta
   * está ausente — não desabilitado — com a razão em texto (Doc 2, L11).
   */
  canAnswer?: boolean;
  onAnswer?: (resposta: string) => void;
  style?: CSSProperties;
}

export function PendencyCard({
  question,
  askedBy,
  askedAt,
  answer,
  canAnswer = false,
  onAnswer,
  style,
}: PendencyCardProps) {
  const [rascunho, setRascunho] = useState('');

  return (
    <div
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
          style={{
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-attention)',
          }}
        >
          Pendência aberta
        </span>
      </div>

      <p style={{ font: 'var(--text-body-lg)', color: 'var(--text-primary)' }}>{question}</p>
      <p style={{ marginTop: 6, font: '500 12px var(--font-data)', color: 'var(--text-meta)' }}>
        {askedBy}
        {askedAt ? ` · ${askedAt}` : ''}
      </p>

      {answer ? (
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
            Resposta
          </span>
          <p style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{answer}</p>
        </div>
      ) : canAnswer ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TextField
            label="Sua resposta"
            multiline
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder="Foram duas compras no mesmo cupom: 65 de gás e 70 de extintor."
          />
          <Button density="field" fullWidth iconName="send" onClick={() => onAnswer?.(rascunho)}>
            Responder
          </Button>
        </div>
      ) : (
        <p style={{ marginTop: 12, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          A pergunta é de quem registrou. Você conferiu este lançamento — a resposta não é sua para dar.
        </p>
      )}
    </div>
  );
}
