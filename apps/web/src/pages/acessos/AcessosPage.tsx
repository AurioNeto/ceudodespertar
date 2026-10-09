import { useState } from 'react';
import { ScreenHeader } from '../../ds';
import { SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { useSessao } from '../../app/sessao';
import { AbaDeGrupos } from './AbaDeGrupos';
import { AbaDeUsuarios } from './AbaDeUsuarios';

type Aba = 'usuarios' | 'grupos';

const ROTULO_DA_ABA: Record<Aba, string> = { usuarios: 'Usuários', grupos: 'Grupos' };

export function AcessosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { pode } = useSessao();
  const podeGerenciarUsuarios = pode('sistema.usuario.gerenciar');
  const podeVerGrupos = podeGerenciarUsuarios || pode('sistema.grupo.gerenciar');

  const abasVisiveis: readonly Aba[] = [...(podeGerenciarUsuarios ? (['usuarios'] as const) : []), ...(podeVerGrupos ? (['grupos'] as const) : [])];
  const [abaEscolhida, setAbaEscolhida] = useState<Aba>('usuarios');
  const aba = abasVisiveis.includes(abaEscolhida) ? abaEscolhida : abasVisiveis[0];

  if (!aba) return null;

  return (
    <>
      <ScreenHeader
        title="Acessos"
        subtitle={campo ? undefined : 'Quem entra no sistema e o que cada grupo pode fazer'}
        density={densidade}
      />
      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 1080,
        }}
      >
        {abasVisiveis.length > 1 ? (
          <SeletorDeTipo
            opcoes={abasVisiveis.map((valor) => ({ valor, label: ROTULO_DA_ABA[valor] }))}
            valor={aba}
            onEscolher={setAbaEscolhida}
            densidade={densidade}
          />
        ) : null}
        {aba === 'usuarios' ? <AbaDeUsuarios /> : <AbaDeGrupos />}
      </div>
    </>
  );
}
