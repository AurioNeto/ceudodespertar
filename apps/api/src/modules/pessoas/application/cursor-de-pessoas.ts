import { textoSemCaractereNulo } from '@cdd/contracts';
import { z } from 'zod';

export interface PosicaoDaListagem {
  readonly chaveDeNome: string;
  readonly id: string;
}

export class ErroDeCursorDePessoasInvalido extends Error {
  constructor() {
    super('cursor de pessoas inválido');
    this.name = 'ErroDeCursorDePessoasInvalido';
  }
}

const CursorDecodificado = z.object({
  chaveDeNome: textoSemCaractereNulo(),
  id: z.uuid(),
});

export function codificarCursorDePessoas(posicao: PosicaoDaListagem): string {
  return Buffer.from(JSON.stringify({ chaveDeNome: posicao.chaveDeNome, id: posicao.id })).toString('base64url');
}

export function decodificarCursorDePessoas(cursor: string): PosicaoDaListagem {
  const resultado = CursorDecodificado.safeParse(lerJson(cursor));
  if (!resultado.success) throw new ErroDeCursorDePessoasInvalido();
  return resultado.data;
}

function lerJson(cursor: string): unknown {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new ErroDeCursorDePessoasInvalido();
  }
}
