import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessao } from '@/app/sessao';

type SituacaoDoRetorno = 'concluindo' | 'falhou';

export function useConclusaoDoRetorno() {
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
