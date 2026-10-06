import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SkeletonList } from '../../ds';
import { useDensidade } from '../../lib/useDensidade';
import { ROTAS_PUBLICAS } from '../../app/navegacao';
import { useSessao } from '../../app/sessao';
import { MensagemDeEntradaNaTela } from './MensagemDeEntradaNaTela';
import { MENSAGEM_DE_ERRO_NO_RETORNO } from './mensagens';
import { Portao } from './Portao';

type SituacaoDoRetorno = 'concluindo' | 'falhou';

function useConclusaoDoRetorno() {
  const { concluirEntrada } = useSessao();
  const navigate = useNavigate();
  const [situacao, setSituacao] = useState<SituacaoDoRetorno>('concluindo');

  useEffect(() => {
    let vivo = true;
    concluirEntrada(window.location.href).then(
      (destino) => {
        if (vivo) navigate(destino, { replace: true });
      },
      () => {
        if (vivo) setSituacao('falhou');
      },
    );
    return () => {
      vivo = false;
    };
  }, [concluirEntrada, navigate]);

  return situacao;
}

export function RetornoPage() {
  const densidade = useDensidade();
  const navigate = useNavigate();
  const situacao = useConclusaoDoRetorno();

  if (situacao === 'falhou') {
    return (
      <Portao titulo="Entrar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MensagemDeEntradaNaTela mensagem={MENSAGEM_DE_ERRO_NO_RETORNO} />
          <Button
            iconName="log-in"
            density={densidade}
            fullWidth
            onClick={() => navigate(ROTAS_PUBLICAS.entrar, { replace: true })}
          >
            Voltar para a entrada
          </Button>
        </div>
      </Portao>
    );
  }

  return (
    <Portao titulo="Entrando" descricao="Concluindo o seu acesso…">
      <SkeletonList rows={2} />
    </Portao>
  );
}
