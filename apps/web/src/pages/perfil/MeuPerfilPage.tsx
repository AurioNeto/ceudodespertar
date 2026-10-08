import type { ReactNode } from 'react';
import type { Eu } from '@cdd/contracts';
import { Button, InfraError, ScreenHeader, SkeletonList } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { iniciais } from '../../lib/formato';
import { useSessao } from '../../app/sessao';
import { agruparPermissoes } from './permissoesAgrupadas';

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export function MeuPerfilPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { estado, encerrar, tentarDeNovo } = useSessao();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-11' : 'F-11 · Meu perfil'}
        title="Meu perfil"
        subtitle={campo ? undefined : 'Seus dados de acesso ao sistema'}
        density={densidade}
      />
      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 860,
        }}
      >
        {estado.tipo === 'ativa' ? (
          <PerfilDoEu eu={estado.eu} campo={campo} aoSair={encerrar} />
        ) : estado.tipo === 'verificando' ? (
          <SkeletonList rows={3} />
        ) : (
          <InfraError description="Não foi possível carregar o seu perfil." onRetry={tentarDeNovo} />
        )}
      </div>
    </>
  );
}

interface PerfilDoEuProps {
  readonly eu: Eu;
  readonly campo: boolean;
  readonly aoSair: () => void;
}

function PerfilDoEu({ eu, campo, aoSair }: PerfilDoEuProps) {
  const modulos = agruparPermissoes(eu.permissoes);
  return (
    <>
      <Cartao>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span
            aria-hidden="true"
            style={{
              width: 74,
              height: 74,
              borderRadius: 'var(--radius)',
              background: 'var(--color-royal-soft)',
              color: 'var(--color-royal-deep)',
              display: 'grid',
              placeItems: 'center',
              font: '700 24px var(--font-data)',
            }}
          >
            {iniciais(eu.usuario.nome)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{eu.usuario.nome}</div>
            <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{eu.usuario.email}</div>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 14,
          }}
        >
          <Leitura rotulo="Nome" valor={eu.usuario.nome} />
          <Leitura rotulo="E-mail" valor={eu.usuario.email} />
          <Leitura rotulo="Instituição" valor={eu.instituicao.nome} />
          <Leitura
            rotulo="Grupos"
            valor={eu.grupos.length > 0 ? eu.grupos.map((grupo) => grupo.nome).join(', ') : 'Nenhum grupo'}
            nota="quem muda é um administrador"
          />
        </div>
      </Cartao>

      <Cartao>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Minhas permissões</span>
        {modulos.length === 0 ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Nenhuma permissão concedida ao seu acesso.
          </span>
        ) : (
          modulos.map((modulo) => (
            <section
              key={modulo.modulo}
              aria-label={`Permissões de ${modulo.modulo}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <span style={rotuloLabel}>{modulo.modulo}</span>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {modulo.permissoes.map((permissao) => (
                  <li key={permissao.codigo} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {permissao.descricao ? (
                      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                        {permissao.descricao}
                      </span>
                    ) : null}
                    <span style={{ font: 'var(--text-code)', fontSize: 11, color: 'var(--text-meta)' }}>
                      {permissao.codigo}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Cartao>

      <Cartao>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Sair da conta</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              encerra a sessão apenas neste aparelho
            </span>
          </span>
          <Button variant="quiet" iconName="log-in" onClick={aoSair}>
            Sair
          </Button>
        </div>
      </Cartao>
    </>
  );
}

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Leitura({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
    </div>
  );
}
