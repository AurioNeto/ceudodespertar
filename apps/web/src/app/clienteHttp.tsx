import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ClienteHttp } from '../dados/clienteHttp';

const Contexto = createContext<ClienteHttp | null>(null);

export interface ClienteHttpProviderProps {
  readonly cliente: ClienteHttp;
  readonly children: ReactNode;
}

export function ClienteHttpProvider({ cliente, children }: ClienteHttpProviderProps) {
  return <Contexto.Provider value={cliente}>{children}</Contexto.Provider>;
}

export function useClienteHttp(): ClienteHttp {
  const cliente = useContext(Contexto);
  if (!cliente) throw new Error('useClienteHttp fora do ClienteHttpProvider');
  return cliente;
}
