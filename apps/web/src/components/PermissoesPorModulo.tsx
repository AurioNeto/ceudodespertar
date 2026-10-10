import type { Permissao } from '@cdd/contracts';
import { agruparPermissoes } from '../lib/permissoesAgrupadas';
import { Rotulo } from '@/ds';

export interface PermissoesPorModuloProps {
  readonly codigos: readonly Permissao[];
  readonly rotuloAcessivel: (modulo: string) => string;
  readonly mostrarCodigo: boolean;
  readonly vazio: string;
}

export function PermissoesPorModulo({ codigos, rotuloAcessivel, mostrarCodigo, vazio }: PermissoesPorModuloProps) {
  const modulos = agruparPermissoes(codigos);

  if (modulos.length === 0) {
    return <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{vazio}</span>;
  }

  return (
    <>
      {modulos.map((modulo) => (
        <section
          key={modulo.modulo}
          aria-label={rotuloAcessivel(modulo.modulo)}
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <Rotulo>{modulo.modulo}</Rotulo>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: mostrarCodigo ? 6 : 4,
            }}
          >
            {modulo.permissoes.map((permissao) => (
              <li key={permissao.codigo} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {mostrarCodigo ? (
                  <>
                    {permissao.descricao ? (
                      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                        {permissao.descricao}
                      </span>
                    ) : null}
                    <span style={{ font: 'var(--text-code)', fontSize: 11, color: 'var(--text-meta)' }}>
                      {permissao.codigo}
                    </span>
                  </>
                ) : (
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                    {permissao.descricao ?? permissao.codigo}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
