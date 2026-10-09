import { z } from 'zod';

export interface PosicaoDaListagem {
  readonly chaveDeNome: string;
  readonly id: string;
}

export class ErroDeCursorDeUsuariosInvalido extends Error {
  constructor() {
    super('cursor de usuários inválido');
    this.name = 'ErroDeCursorDeUsuariosInvalido';
  }
}

const CursorDecodificado = z.object({
  chaveDeNome: z.string(),
  id: z.uuid(),
});

export function codificarCursorDeUsuarios(posicao: PosicaoDaListagem): string {
  return Buffer.from(JSON.stringify({ chaveDeNome: posicao.chaveDeNome, id: posicao.id })).toString('base64url');
}

export function decodificarCursorDeUsuarios(cursor: string): PosicaoDaListagem {
  const resultado = CursorDecodificado.safeParse(lerJson(cursor));
  if (!resultado.success) throw new ErroDeCursorDeUsuariosInvalido();
  return resultado.data;
}

function lerJson(cursor: string): unknown {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new ErroDeCursorDeUsuariosInvalido();
  }
}
