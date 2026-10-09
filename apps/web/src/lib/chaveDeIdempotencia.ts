import { useState } from 'react';

export type GeradorDeChave = () => string;

export interface GuardiaoDeChave {
  chavePara(conteudo: unknown): string;
}

export function criarGuardiaoDeChave(gerar: GeradorDeChave): GuardiaoDeChave {
  let assinaturaAtual: string | null = null;
  let chaveAtual = '';
  return {
    chavePara(conteudo) {
      const assinatura = JSON.stringify(conteudo);
      if (assinatura !== assinaturaAtual) {
        assinaturaAtual = assinatura;
        chaveAtual = gerar();
      }
      return chaveAtual;
    },
  };
}

const gerarChaveAleatoria: GeradorDeChave = () => crypto.randomUUID();

export function useChaveDeIdempotencia(gerar: GeradorDeChave = gerarChaveAleatoria): GuardiaoDeChave['chavePara'] {
  const [guardiao] = useState(() => criarGuardiaoDeChave(gerar));
  return guardiao.chavePara;
}
