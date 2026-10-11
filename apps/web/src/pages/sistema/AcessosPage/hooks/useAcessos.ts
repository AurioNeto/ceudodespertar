import { useState } from 'react';
import { useSessao } from '@/app/sessao';
import type { Aba } from '../constantes';
import { abasVisiveis } from '../utils/abasVisiveis';

export function useAcessos() {
  const { pode } = useSessao();
  const podeGerenciarUsuarios = pode('sistema.usuario.gerenciar');
  const podeVerGrupos = podeGerenciarUsuarios || pode('sistema.grupo.gerenciar');

  const abas = abasVisiveis({ podeGerenciarUsuarios, podeVerGrupos });
  const [abaEscolhida, setAbaEscolhida] = useState<Aba>('usuarios');
  const aba = abas.includes(abaEscolhida) ? abaEscolhida : abas[0];

  const [conviteAberto, setConviteAberto] = useState(false);

  return { podeGerenciarUsuarios, abas, aba, setAbaEscolhida, conviteAberto, setConviteAberto };
}
