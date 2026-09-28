import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ArgumentMetadata } from '@nestjs/common';
import { ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { PipeDeValidacaoZod } from './pipe-de-validacao-zod.js';

const ESQUEMA = z.object({ nome: z.string().min(1) });

function metadadoDoCorpo(): ArgumentMetadata {
  return { type: 'body', metatype: undefined, data: undefined, schema: ESQUEMA } as unknown as ArgumentMetadata;
}

describe('PipeDeValidacaoZod', () => {
  it('devolve o valor transformado quando o corpo é válido', async () => {
    const pipe = new PipeDeValidacaoZod();

    const resultado = await pipe.transform({ nome: 'Casa A' }, metadadoDoCorpo());

    expect(resultado).toStrictEqual({ nome: 'Casa A' });
  });

  it('lança ErroDeDominioException com CORPO_INVALIDO e os problemas do Zod quando o corpo é inválido', async () => {
    const pipe = new PipeDeValidacaoZod();

    await expect(pipe.transform({ nome: '' }, metadadoDoCorpo())).rejects.toThrow(ErroDeDominioException);
  });

  it('não ecoa o valor recebido nos detalhes — só caminho e mensagem', async () => {
    const pipe = new PipeDeValidacaoZod();

    try {
      await pipe.transform({ nome: '' }, metadadoDoCorpo());
      expect.unreachable();
    } catch (excecao) {
      const erro = (excecao as ErroDeDominioException).erroDeDominio;
      expect(erro.codigo).toBe('CORPO_INVALIDO');
      expect(erro.detalhes).toStrictEqual({
        problemas: [{ caminho: 'nome', mensagem: expect.any(String) }],
      });
    }
  });
});
