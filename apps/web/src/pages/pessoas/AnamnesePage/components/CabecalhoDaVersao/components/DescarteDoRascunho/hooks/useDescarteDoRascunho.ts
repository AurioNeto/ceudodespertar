import { useState } from 'react';

export function useDescarteDoRascunho() {
  const [confirmando, setConfirmando] = useState(false);
  const pedirConfirmacao = () => setConfirmando(true);
  const manterRascunho = () => setConfirmando(false);
  return { confirmando, pedirConfirmacao, manterRascunho };
}
