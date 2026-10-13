import type { NivelDeContribuicao } from '@cdd/contracts';
import { AmountDisplay, Cartao, Rotulo, StatusBadge, TextField, type Density, fundoComVidro } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import type { EventoParaInscricao } from '../../mocks/eventos';
import { contribuicaoDigitada } from '../../utils/valorDaInscricao';
import { CONTRIBUICAO_POR_QUEM_INSCREVE } from './constantes';

export interface ContribuicaoProps {
  evento: EventoParaInscricao;
  quemInscreve: keyof typeof CONTRIBUICAO_POR_QUEM_INSCREVE;
  isento: boolean;
  nivel: NivelDeContribuicao | null;
  valor: string;
  onNivel: (n: NivelDeContribuicao, valorFormatado: string) => void;
  onValor: (v: string) => void;
  densidade: Density;
}

export function Contribuicao({
  evento,
  quemInscreve,
  isento,
  nivel,
  valor,
  onNivel,
  onValor,
  densidade,
}: ContribuicaoProps) {
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

  const textos = CONTRIBUICAO_POR_QUEM_INSCREVE[quemInscreve];
  const escolhido = evento.contribuicoes.find((c) => c.nivel === nivel);
  const digitado = contribuicaoDigitada(valor);
  const social = evento.contribuicoes[0]!.valor;
  const prospero = evento.contribuicoes[2]!.valor;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>{textos.titulo}</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: textos.larguraDoRecado }}>
        {textos.recado.inicio}
        <b>{textos.recado.destaque}</b>
        {textos.recado.fim}
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
                borderRadius: 'var(--leaf-sm)',
                border: `1px solid ${marcado ? 'var(--color-royal)' : 'var(--border-field)'}`,
                ...fundoComVidro(marcado ? 'var(--color-royal-soft)' : 'var(--bg-card)'),
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
              <AmountDisplay value={c.valor / 100} size="sm" style={{ color: 'var(--color-royal-deep)' }} />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.explicacao}</span>
            </button>
          );
        })}
      </div>

      <TextField
        label={textos.rotuloDoValor}
        value={valor}
        density={campo ? 'field' : 'office'}
        placeholder="0,00"
        inputMode={textos.tecladoDoValor}
        onChange={(e) => onValor(e.target.value)}
        hint={textos.dicaDoValor}
      />

      {digitado > 0 && digitado < social ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{textos.abaixoDoSocial}</span>
      ) : null}
      {digitado > prospero ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>{textos.acimaDoProspero}</span>
      ) : null}
      {textos.mostraNivelEscolhido && escolhido && digitado === escolhido.valor ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          No nível {escolhido.rotulo.toLowerCase()}.
        </span>
      ) : null}
    </Cartao>
  );
}
