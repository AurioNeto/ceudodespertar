import { Button, ScreenHeader, varianteDoPainel, useDensidade, SeletorDeTipo } from '@/ds';
import { AbaDeGrupos } from './components/AbaDeGrupos';
import { AbaDeUsuarios } from './components/AbaDeUsuarios';
import { focarTitulo } from './utils/focarTitulo';
import { PainelDeConvite } from './components/PainelDeConvite';
import { ROTULO_DA_ABA } from './constantes';
import { useAcessos } from './hooks/useAcessos';

export function AcessosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { podeGerenciarUsuarios, abas, aba, setAbaEscolhida, conviteAberto, setConviteAberto } = useAcessos();

  if (!aba) return null;

  return (
    <>
      <ScreenHeader
        title="Acessos"
        subtitle={campo ? undefined : 'Quem entra no sistema e o que cada grupo pode fazer'}
        density={densidade}
        actions={
          podeGerenciarUsuarios ? (
            <Button density={densidade} iconName="user-plus" aria-haspopup="dialog" onClick={() => setConviteAberto(true)}>
              Convidar
            </Button>
          ) : undefined
        }
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
        {abas.length > 1 ? (
          <SeletorDeTipo
            opcoes={abas.map((valor) => ({ valor, label: ROTULO_DA_ABA[valor] }))}
            valor={aba}
            onEscolher={setAbaEscolhida}
            densidade={densidade}
          />
        ) : null}
        {aba === 'usuarios' ? <AbaDeUsuarios /> : <AbaDeGrupos />}
      </div>
      {podeGerenciarUsuarios ? (
        <PainelDeConvite
          aberto={conviteAberto}
          variante={varianteDoPainel(densidade)}
          densidade={densidade}
          aoFechar={() => setConviteAberto(false)}
          focoDeReserva={focarTitulo}
        />
      ) : null}
    </>
  );
}
