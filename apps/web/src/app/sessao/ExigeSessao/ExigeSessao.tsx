import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Portao, SkeletonList } from '@/ds';
import { ROTAS_PUBLICAS } from '@/app/rotas';
import { useSessao } from '../SessaoProvider';

export function ExigeSessao({ children }: { children: ReactNode }) {
  const { estado } = useSessao();
  const { pathname, search } = useLocation();

  if (estado.tipo === 'ativa') return <>{children}</>;

  if (estado.tipo === 'verificando') {
    return (
      <Portao titulo="Verificando seu acesso" descricao="Só um instante.">
        <SkeletonList rows={2} />
      </Portao>
    );
  }

  return <Navigate to={ROTAS_PUBLICAS.entrar} replace state={{ de: `${pathname}${search}` }} />;
}
