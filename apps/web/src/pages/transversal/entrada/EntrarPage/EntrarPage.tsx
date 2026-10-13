import { Navigate, useLocation } from 'react-router-dom';
import { Button, Portao, SkeletonList, useDensidade } from '@/ds';
import { destinoDaNavegacao } from '@/app/rotas';
import { useSessao } from '@/app/sessao';
import { MensagemDeEntradaNaTela } from '../components/MensagemDeEntradaNaTela';
import { DESCRICAO_DA_ENTRADA, MENSAGEM_DE_CONVITE_RECEBIDO, MENSAGEM_DE_FALHA_AO_INICIAR } from './constantes';
import { useConviteDaUrl } from './hooks/useConviteDaUrl';
import { useInicioDaEntrada } from './hooks/useInicioDaEntrada';
import { mensagemDoEstado } from './utils/mensagemDoEstado';

export function EntrarPage() {
  const densidade = useDensidade();
  const { estado, encerrar, tentarDeNovo } = useSessao();
  const destino = destinoDaNavegacao(useLocation().state);
  const { indo, falhou, iniciar } = useInicioDaEntrada(destino);
  const { chegouComConvite, limpandoAUrl } = useConviteDaUrl();

  if (limpandoAUrl || estado.tipo === 'verificando') {
    return (
      <Portao titulo="Entrar" descricao="Verificando seu acesso…">
        <SkeletonList rows={2} />
      </Portao>
    );
  }

  if (estado.tipo === 'ativa') return <Navigate to={destino} replace />;

  if (estado.tipo === 'sem-sessao') {
    return (
      <Portao titulo="Entrar" descricao={DESCRICAO_DA_ENTRADA}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {chegouComConvite && !falhou ? <MensagemDeEntradaNaTela mensagem={MENSAGEM_DE_CONVITE_RECEBIDO} /> : null}
          {falhou ? <MensagemDeEntradaNaTela mensagem={MENSAGEM_DE_FALHA_AO_INICIAR} /> : null}
          <Button iconName="log-in" density={densidade} fullWidth disabled={indo} onClick={() => void iniciar()}>
            {indo ? 'Indo para o login…' : 'Entrar'}
          </Button>
        </div>
      </Portao>
    );
  }

  const mensagem = mensagemDoEstado(estado);
  const conviteRecusado = estado.tipo === 'convite-recusado';
  const recusada = estado.tipo === 'recusada' || conviteRecusado;
  const podeTentarDeNovo = estado.tipo === 'indisponivel' || estado.tipo === 'falha';

  return (
    <Portao titulo="Entrar" descricao={DESCRICAO_DA_ENTRADA}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <MensagemDeEntradaNaTela mensagem={mensagem} />
        {podeTentarDeNovo ? (
          <Button iconName="rotate-ccw" density={densidade} fullWidth onClick={tentarDeNovo}>
            Tentar de novo
          </Button>
        ) : null}
        {conviteRecusado ? (
          <Button iconName="arrow-right" density={densidade} fullWidth onClick={tentarDeNovo}>
            Continuar
          </Button>
        ) : null}
        {recusada || estado.tipo === 'falha' ? (
          <Button variant="quiet" iconName="user-round" density={densidade} fullWidth onClick={encerrar}>
            Sair e usar outra conta
          </Button>
        ) : null}
      </div>
    </Portao>
  );
}
