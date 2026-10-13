import { Icon, type Density, fundoComVidro } from '@/ds';

interface RespostaDaPergunta {
  pergunta: string;
  nota?: undefined;
  valor?: undefined;
}

interface OpcaoComValor {
  pergunta?: undefined;
  nota?: string;
  valor: string;
}

export type OpcaoMarcavelProps = {
  rotulo: string;
  marcada: boolean;
  multipla?: boolean;
  densidade: Density;
  onEscolher: () => void;
} & (RespostaDaPergunta | OpcaoComValor);

export function OpcaoMarcavel({
  rotulo,
  pergunta,
  nota,
  valor,
  marcada,
  multipla = false,
  densidade,
  onEscolher,
}: OpcaoMarcavelProps) {
  const campo = densidade === 'field';
  const resposta = pergunta !== undefined;
  const forma = resposta
    ? {
        flex: 1,
        minHeight: campo ? 'var(--target-field)' : 44,
        padding: '11px 15px',
        gap: 9,
        color: marcada ? 'var(--color-royal-ink)' : 'var(--text-primary)',
        font: marcada ? 'var(--text-body-strong)' : 'var(--text-body)',
      }
    : { minHeight: campo ? 'var(--target-field)' : undefined, padding: '11px 14px', gap: 11 };

  return (
    <button
      type="button"
      aria-pressed={marcada}
      aria-label={resposta ? `${rotulo} — ${pergunta}` : rotulo}
      onClick={onEscolher}
      style={{
        textAlign: 'left',
        borderRadius: 'var(--leaf-sm)',
        border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--border-field)'}`,
        ...fundoComVidro(marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)'),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        ...forma,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: multipla ? 'var(--leaf-xs)' : 'var(--leaf-seal)',
          border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--border-field)'}`,
          background: marcada ? 'var(--color-royal)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {marcada ? <Icon name="check" size={11} color="var(--bg-card-solid)" /> : null}
      </span>
      {resposta ? (
        rotulo
      ) : (
        <>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
            {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
          </span>
          <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {valor}
          </span>
        </>
      )}
    </button>
  );
}
