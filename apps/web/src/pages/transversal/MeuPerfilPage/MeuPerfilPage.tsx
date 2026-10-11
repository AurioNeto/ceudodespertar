import { CorpoDaTela, ScreenHeader, useDensidade } from '@/ds';
import { useSessao } from '@/app/sessao';
import { PerfilDoEu } from './components/PerfilDoEu';

export function MeuPerfilPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { estado, encerrar } = useSessao();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-11' : 'F-11 · Meu perfil'}
        title="Meu perfil"
        subtitle={campo ? undefined : 'Seus dados de acesso ao sistema'}
        density={densidade}
      />
      <CorpoDaTela densidade={densidade} larguraMaxima={860} espaco="compacto">
        {estado.tipo === 'ativa' ? <PerfilDoEu eu={estado.eu} densidade={densidade} aoSair={encerrar} /> : null}
      </CorpoDaTela>
    </>
  );
}
