import { useLocation } from 'react-router-dom';
import { useDensidade } from '@/ds';
import { destinoDaNavegacao } from '@/app/rotas';
import { useSessao } from '@/app/sessao';
import { useConviteDaUrl } from './useConviteDaUrl';
import { useInicioDaEntrada } from './useInicioDaEntrada';

export function useEntrada() {
  const densidade = useDensidade();
  const { estado, encerrar, tentarDeNovo } = useSessao();
  const destino = destinoDaNavegacao(useLocation().state);
  const { indo, falhou, iniciar } = useInicioDaEntrada(destino);
  const { chegouComConvite, limpandoAUrl } = useConviteDaUrl();

  return { densidade, estado, encerrar, tentarDeNovo, destino, indo, falhou, iniciar, chegouComConvite, limpandoAUrl };
}
