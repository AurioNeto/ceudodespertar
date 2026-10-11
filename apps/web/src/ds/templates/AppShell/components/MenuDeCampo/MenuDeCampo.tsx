import { PainelDeAcao } from '../../../../organisms/PainelDeAcao';
import type { GrupoDoMenu } from '../../tipos';
import { GrupoNoMenu } from './components/GrupoNoMenu';
import { PerfilNoMenu } from './components/PerfilNoMenu';

interface MenuDeCampoProps {
  aberto: boolean;
  grupos: readonly GrupoDoMenu[];
  activeId: string | undefined;
  user: { name: string; group: string };
  userLabel: string;
  userActive: boolean;
  onNavigate: ((id: string) => void) | undefined;
  onUserClick: (() => void) | undefined;
  aoFechar: () => void;
  focoDeReserva: () => HTMLElement | null;
}

export function MenuDeCampo({
  aberto,
  grupos,
  activeId,
  user,
  userLabel,
  userActive,
  onNavigate,
  onUserClick,
  aoFechar,
  focoDeReserva,
}: MenuDeCampoProps) {
  const navegarPara = (id: string) => {
    onNavigate?.(id);
    aoFechar();
  };
  const abrirPerfil = () => {
    onUserClick?.();
    aoFechar();
  };

  return (
    <PainelDeAcao aberto={aberto} titulo="Menu" variante="folha" aoFechar={aoFechar} focoDeReserva={focoDeReserva}>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grupos.map((grupo) => (
          <GrupoNoMenu key={grupo.posicao} grupo={grupo} activeId={activeId} onNavigate={navegarPara} />
        ))}
        {onUserClick ? <PerfilNoMenu user={user} rotulo={userLabel} ativo={userActive} aoAbrir={abrirPerfil} /> : null}
      </nav>
    </PainelDeAcao>
  );
}
