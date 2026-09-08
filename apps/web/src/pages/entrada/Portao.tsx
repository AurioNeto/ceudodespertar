import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FlowerOfLife, Icon } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';

/**
 * A moldura das telas de entrada — login, convite e redefinição.
 *
 * É a única parte do sistema que vive fora do AppShell, e por isso a única que
 * precisa carregar a marca sozinha. No escritório ela abre em duas faces: a da
 * casa, com o wordmark e a flor da vida, e a do trabalho, com o formulário. No
 * celular a face da casa vira um cabeçalho curto — quem entra pelo telefone
 * está com pressa, e o formulário tem que caber acima do teclado.
 *
 * Quando o Keycloak entrar (Doc 1 §4.4), este arquivo é o que vira template do
 * login theme: a marcação abaixo já está separada do que é lógica de tela.
 */

export interface PortaoProps {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  /** Link discreto no pé do cartão — "voltar para a entrada", em geral. */
  volta?: { para: string; rotulo: string };
}

export function Portao({ titulo, descricao, children, volta }: PortaoProps) {
  const campo = useDensidade() === 'field';

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'minmax(0,44%) minmax(0,56%)',
        // No celular a marca é cabeçalho: ela ocupa o que precisa e devolve o
        // resto da altura ao formulário, em vez de as duas faixas dividirem a
        // tela ao meio.
        gridTemplateRows: campo ? 'auto 1fr' : undefined,
        background: 'var(--bg-app)',
      }}
    >
      <Marca campo={campo} />

      <div
        style={{
          display: 'flex',
          alignItems: campo ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: campo ? '22px 18px 40px' : '40px 32px',
          overflow: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 404 }}>
          <h1 style={{ font: 'var(--text-display)', color: 'var(--text-title)' }}>{titulo}</h1>
          {descricao ? (
            <p
              style={{
                marginTop: 9,
                font: 'var(--text-body)',
                color: 'var(--text-secondary)',
                maxWidth: '42ch',
              }}
            >
              {descricao}
            </p>
          ) : null}

          <div style={{ marginTop: 24 }}>{children}</div>

          {volta ? (
            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
              <Link
                to={volta.para}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  font: 'var(--text-small)',
                  border: 0,
                }}
              >
                <Icon name="arrow-left" size={15} />
                {volta.rotulo}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Marca({ campo }: { campo: boolean }) {
  const wordmark = (
    <div>
      <div
        style={{
          font: campo ? '800 17px/1.05 var(--font-display)' : '800 34px/1.02 var(--font-display)',
          letterSpacing: '.01em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-brand)',
        }}
      >
        Céu do
        {campo ? ' ' : <br />}
        Despertar
      </div>
      <div
        style={{
          marginTop: campo ? 4 : 12,
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-field-label)',
        }}
      >
        Sistema de gestão
      </div>
    </div>
  );

  if (campo) {
    return (
      <header
        style={{
          background: 'var(--bg-brand)',
          borderBottom: '1px solid var(--color-line-gold)',
          padding: '20px 18px',
        }}
      >
        {wordmark}
      </header>
    );
  }

  return (
    <aside
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-brand)',
        borderRight: '1px solid var(--color-line-gold)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '44px 44px 38px',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: 560, height: 560, right: -150, top: '50%', marginTop: -280 }}
      >
        <FlowerOfLife />
      </div>

      <div style={{ position: 'relative' }}>{wordmark}</div>

      <div style={{ position: 'relative', maxWidth: '30ch' }}>
        <div style={{ height: 1, background: 'var(--color-line-gold)', marginBottom: 18 }} />
        <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          O registro único do que a casa move: dinheiro, cerimônias, pessoas e o daime.
        </p>
      </div>
    </aside>
  );
}
