import { z } from 'zod';

export interface PosicaoDaTrilha {
  readonly em: Date;
  readonly id: string;
}

export class ErroDeCursorInvalido extends Error {
  constructor() {
    super('cursor de auditoria inválido');
    this.name = 'ErroDeCursorInvalido';
  }
}

const CursorDecodificado = z.object({
  em: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

export function codificarCursor(posicao: PosicaoDaTrilha): string {
  return Buffer.from(JSON.stringify({ em: posicao.em.toISOString(), id: posicao.id })).toString('base64url');
}

export function decodificarCursor(cursor: string): PosicaoDaTrilha {
  const resultado = CursorDecodificado.safeParse(lerJson(cursor));
  if (!resultado.success) throw new ErroDeCursorInvalido();
  return { em: new Date(resultado.data.em), id: resultado.data.id };
}

function lerJson(cursor: string): unknown {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new ErroDeCursorInvalido();
  }
}
