import type { UsuarioListado } from '@cdd/contracts';
import { Button, StatusBadge } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { Avatar } from '../../components/Avatar';
import { formatarDataHora } from '../../lib/formato';
import { SITUACAO_DE_USUARIO } from './situacaoDeUsuario';

export interface LinhaDeUsuarioProps {
  readonly usuario: UsuarioListado;
  readonly aoGerenciar: (usuario: UsuarioListado) => void;
}

export function LinhaDeUsuario({ usuario, aoGerenciar }: LinhaDeUsuarioProps) {
  const densidade = useDensidade();
  const situacao = SITUACAO_DE_USUARIO[usuario.situacao];
  const ultimoAcesso = usuario.ultimoAcessoEm
    ? `Último acesso: ${formatarDataHora(usuario.ultimoAcessoEm)}`
    : 'Último acesso: nunca';

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '11px 14px',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
      }}
    >
      <Avatar nome={usuario.nome} />
      <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{usuario.nome}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{usuario.email}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{ultimoAcesso}</span>
      </span>
      <ul
        aria-label={`Grupos de ${usuario.nome}`}
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {usuario.grupos.map((grupo) => (
          <li key={grupo.id}>
            <StatusBadge tone="royal">{grupo.nome}</StatusBadge>
          </li>
        ))}
      </ul>
      <StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>
      <Button
        variant="ghost"
        density={densidade}
        aria-label={`Gerenciar acesso de ${usuario.nome}`}
        aria-haspopup="dialog"
        onClick={() => aoGerenciar(usuario)}
      >
        Gerenciar
      </Button>
    </li>
  );
}
