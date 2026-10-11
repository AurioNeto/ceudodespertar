import type { NivelDeContribuicao } from '@cdd/contracts';
import { Cartao, Rotulo, StatusBadge, TextField, type Density } from '@/ds';
import { formatarBRL, formatarDinheiro } from '@/pages/utils/formato';
import type { eventos } from '../../../mocks/eventos';

export interface ContribuicaoProps {
  evento: (typeof eventos)[number];
  isento: boolean;
  nivel: NivelDeContribuicao | null;
  valor: string;
  onNivel: (n: NivelDeContribuicao, valorFormatado: string) => void;
  onValor: (v: string) => void;
  densidade: Density;
}

export function Contribuicao({ evento, isento, nivel, valor, onNivel, onValor, densidade }: ContribuicaoProps) {
  const campo = densidade === 'field';
  if (isento) {
    return (
      <Cartao campo={campo} style={{ gap: 9 }}>
        <Rotulo>Contribuição</Rotulo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge tone="neutral">Isento</StatusBadge>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            Equipe não contribui financeiramente.
          </span>
        </div>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Isento não é zero. Zero seria alguém que devia e pagou nada; isento é quem o domínio diz que não deve — e a
          diferença aparece na soma do trabalho, onde a equipe não entra como inadimplência.
        </span>
      </Cartao>
    );
  }

  const escolhido = evento.contribuicoes.find((c) => c.nivel === nivel);
  const digitado = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const social = evento.contribuicoes[0]!.valor;
  const prospero = evento.contribuicoes[2]!.valor;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>Contribuição sugerida</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Três níveis definidos pelos padrinhos, referentes só à participação na cerimônia. <b>São sugestão, não
        preço</b>: o valor se conversa para menos conforme a condição de cada um, e quem quiser contribuir mais pode.
      </span>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {evento.contribuicoes.map((c) => {
          const marcado = nivel === c.nivel;
          return (
            <button
              key={c.nivel}
              type="button"
              aria-pressed={marcado}
              onClick={() => onNivel(c.nivel, formatarDinheiro(c.valor))}
              style={{
                textAlign: 'left',
                padding: '13px 15px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${marcado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                background: marcado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                minHeight: campo ? 'var(--target-field)' : undefined,
              }}
            >
              <span style={{ font: 'var(--text-body-strong)', color: marcado ? 'var(--color-royal-ink)' : 'var(--text-primary)' }}>
                {c.rotulo}
              </span>
              <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
                {formatarBRL(c.valor)}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.explicacao}</span>
            </button>
          );
        })}
      </div>

      <TextField
        label="Valor combinado"
        value={valor}
        density={campo ? 'field' : 'office'}
        placeholder="0,00"
        onChange={(e) => onValor(e.target.value)}
        hint="Sempre editável. Escolher um nível preenche este campo; o que vale é o que está aqui."
      />

      {digitado > 0 && digitado < social ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Abaixo do nível social — combinado com a pessoa. Não precisa de justificativa: a casa não cobra explicação
          de quem contribui com o que pode.
        </span>
      ) : null}
      {digitado > prospero ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
          Acima do próspero — contribuição voluntária além do sugerido.
        </span>
      ) : null}
      {escolhido && digitado === escolhido.valor ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          No nível {escolhido.rotulo.toLowerCase()}.
        </span>
      ) : null}
    </Cartao>
  );
}
