import type { PerguntaDoFormulario, VersaoDoFormulario } from '../mocks/anamnese';

export function publicarVersao(lista: readonly VersaoDoFormulario[], id: string): VersaoDoFormulario[] {
  return lista.map((v) => {
    if (v.id === id) {
      return {
        ...v,
        situacao: 'publicada',
        publicadaEm: '02/09/2026',
        historico: [...v.historico, ['02/09/2026', 'Publicada por Aurio Neto.'] as const],
      };
    }
    if (v.situacao === 'publicada') {
      return {
        ...v,
        situacao: 'arquivada',
        historico: [...v.historico, ['02/09/2026', `Arquivada pela publicação da ${id}.`] as const],
      };
    }
    return v;
  });
}

export const temRascunhoAberto = (versoes: readonly VersaoDoFormulario[]) =>
  versoes.some((v) => v.situacao === 'rascunho');

export function novoRascunho(versoes: readonly VersaoDoFormulario[], base: VersaoDoFormulario): VersaoDoFormulario {
  const numero = versoes.length + 1;
  return {
    id: `v${numero}`,
    rotulo: `Anamnese do corpo · v${numero}`,
    situacao: 'rascunho',
    criadaEm: '02/09/2026',
    criadaPor: 'Aurio Neto',
    publicadaEm: null,
    respostas: 0,
    descricao: `Rascunho aberto a partir da ${base.id}. Enquanto não for publicada, ninguém recebe este formulário.`,
    perguntas: base.perguntas.map((p) => ({ ...p })),
    historico: [['02/09/2026', `Rascunho criado por Aurio Neto a partir da ${base.id}.`]],
  };
}

function trocarPosicao(lista: PerguntaDoFormulario[], de: number, para: number): PerguntaDoFormulario[] {
  const tmp = lista[de]!;
  lista[de] = lista[para]!;
  lista[para] = tmp;
  return lista;
}

export function subirPergunta(lista: PerguntaDoFormulario[], i: number): PerguntaDoFormulario[] {
  if (i === 0) return lista;
  return trocarPosicao(lista, i, i - 1);
}

export function descerPergunta(lista: PerguntaDoFormulario[], i: number): PerguntaDoFormulario[] {
  if (i === lista.length - 1) return lista;
  return trocarPosicao(lista, i, i + 1);
}
