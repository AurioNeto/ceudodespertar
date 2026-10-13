import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PARAMETRO_DO_CONVITE } from '@/dados';
import { useSessao } from '@/app/sessao';

function conviteDa(busca: string): string | null {
  return new URLSearchParams(busca).get(PARAMETRO_DO_CONVITE);
}

export function useConviteDaUrl() {
  const { receberConvite } = useSessao();
  const navigate = useNavigate();
  const { pathname, search, state } = useLocation();
  const conviteNaUrl = conviteDa(search);
  const [chegouComConvite] = useState(() => Boolean(conviteNaUrl));

  useEffect(() => {
    if (conviteNaUrl === null) return;
    if (conviteNaUrl) receberConvite(conviteNaUrl);
    navigate({ pathname, search: '' }, { replace: true, state });
  }, [conviteNaUrl, receberConvite, navigate, pathname, state]);

  return { chegouComConvite, limpandoAUrl: conviteNaUrl !== null };
}
