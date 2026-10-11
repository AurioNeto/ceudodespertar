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
