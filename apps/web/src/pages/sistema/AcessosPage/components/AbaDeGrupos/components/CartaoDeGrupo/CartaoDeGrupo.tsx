import type { GrupoDaGestao } from '@cdd/contracts';
import { StatusBadge, Cartao } from '@/ds';
import { PermissoesPorModulo } from '@/pages/components/PermissoesPorModulo';
import { pluralizar } from '@/pages/utils/formato';

export function CartaoDeGrupo({ grupo }: { grupo: GrupoDaGestao }) {
  return (
    <Cartao as="article" aria-label={`Grupo ${grupo.nome}`}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{grupo.nome}</h3>
        {grupo.protegido ? <StatusBadge tone="neutral">protegido</StatusBadge> : null}
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(grupo.usuarios, 'usuário')}
        </span>
      </div>
      {grupo.descricao ? (
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{grupo.descricao}</p>
      ) : null}
      <PermissoesPorModulo
        codigos={grupo.permissoes}
        mostrarCodigo={false}
        vazio="Nenhuma permissão concedida."
        rotuloAcessivel={(modulo) => `Permissões de ${modulo} do grupo ${grupo.nome}`}
      />
    </Cartao>
  );
}
