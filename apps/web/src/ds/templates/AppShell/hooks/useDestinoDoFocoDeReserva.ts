import { useRef } from 'react';

export function useDestinoDoFocoDeReserva() {
  const lateral = useRef<HTMLElement>(null);
  const principal = useRef<HTMLElement>(null);
  const destino = () =>
    lateral.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
    lateral.current?.querySelector<HTMLElement>('nav button') ??
    principal.current;
  return { lateral, principal, destino };
}
