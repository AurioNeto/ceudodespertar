import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, SkeletonList } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { destinoDaNavegacao } from '../../app/destino';
import { useSessao } from '../../app/sessao';
import { MensagemDeEntradaNaTela } from './MensagemDeEntradaNaTela';
import {
  MENSAGENS_DE_RECUSA,
  MENSAGEM_DE_FALHA,
  MENSAGEM_DE_FALHA_AO_INICIAR,
  MENSAGEM_DE_INDISPONIBILIDADE,
} from './mensagens';
import type { MensagemDeEntrada } from './mensagens';
import { Portao } from './Portao';

const DESCRICAO_DA_ENTRADA = 'O acesso é pessoal: cada lançamento fica no nome de quem o registrou.';

function useInicioDaEntrada(destino: string) {
  const { entrar } = useSessao();
  const [indo, setIndo] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function iniciar() {
    setIndo(true);
    setFalhou(false);
    try {
      await entrar(destino);
    } catch {
      setFalhou(true);
    }
    setIndo(false);
  }

  return { indo, falhou, iniciar };
}

export function EntrarPage() {
  const densidade = useDensidade();
  const { estado, encerrar, tentarDeNovo } = useSessao();
  const destino = destinoDaNavegacao(useLocation().state);
  const { indo, falhou, iniciar } = useInicioDaEntrada(destino);

  if (estado.tipo === 'ativa') return <Navigate to={destino} replace />;

  if (estado.tipo === 'verificando') {
    return (
      <Portao titulo="Entrar" descricao="Verificando seu acesso…">
        <SkeletonList rows={2} />
      </Portao>
    );
  }

  if (estado.tipo === 'sem-sessao') {
    return (
      <Portao titulo="Entrar" descricao={DESCRICAO_DA_ENTRADA}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {falhou ? <MensagemDeEntradaNaTela mensagem={MENSAGEM_DE_FALHA_AO_INICIAR} /> : null}
          <Button iconName="log-in" density={densidade} fullWidth disabled={indo} onClick={() => void iniciar()}>
            {indo ? 'Indo para o login…' : 'Entrar'}
          </Button>
        </div>
      </Portao>
    );
  }

  const mensagem = mensagemDoEstado(estado);
  const recusada = estado.tipo === 'recusada';
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
        {recusada || estado.tipo === 'falha' ? (
          <Button variant="quiet" iconName="user-round" density={densidade} fullWidth onClick={encerrar}>
            Sair e usar outra conta
          </Button>
        ) : null}
      </div>
    </Portao>
  );
}

function mensagemDoEstado(estado: ReturnType<typeof useSessao>['estado']): MensagemDeEntrada {
  if (estado.tipo === 'recusada') return MENSAGENS_DE_RECUSA[estado.codigo];
  if (estado.tipo === 'indisponivel') return MENSAGEM_DE_INDISPONIBILIDADE;
  return MENSAGEM_DE_FALHA;
}
