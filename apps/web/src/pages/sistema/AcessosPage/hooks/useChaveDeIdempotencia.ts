import { useState } from 'react';
import { criarGuardiaoDeChave, type GeradorDeChave, type GuardiaoDeChave } from '../utils/guardiaoDeChave';

const gerarChaveAleatoria: GeradorDeChave = () => crypto.randomUUID();

export function useChaveDeIdempotencia(gerar: GeradorDeChave = gerarChaveAleatoria): GuardiaoDeChave['chavePara'] {
  const [guardiao] = useState(() => criarGuardiaoDeChave(gerar));
  return guardiao.chavePara;
}
