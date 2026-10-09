import { describe, expect, it, vi } from 'vitest';

const BYTES_FIXOS = 1;
const TOKEN_DOS_BYTES_FIXOS = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE';
const SHA256_HEX_DO_TEXTO_DO_TOKEN = '56d5fa7333f6d747db42c239407e5da4c32f4c79f35d092b134fd35a402d9c5c';
const SHA256_HEX_DOS_BYTES_DO_TOKEN = '72cd6e8422c407fb6d098690f1130b7ded7ec2f7f5e1d30bd9d521f015363793';

vi.mock('node:crypto', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('node:crypto')>();
  return { ...original, randomBytes: vi.fn((tamanho: number) => Buffer.alloc(tamanho, BYTES_FIXOS)) };
});

const { randomBytes } = await import('node:crypto');
const { GeradorDeTokenDeConviteNode } = await import(
  '../../../src/modules/identidade/infrastructure/convite/gerador-de-token-de-convite.node.js'
);

describe('GeradorDeTokenDeConviteNode', () => {
  it('gera 32 bytes aleatórios em base64url', () => {
    const { token } = new GeradorDeTokenDeConviteNode().gerar();

    expect(randomBytes).toHaveBeenCalledWith(32);
    expect(token).toBe(TOKEN_DOS_BYTES_FIXOS);
  });

  it('calcula o hash como SHA-256 hexadecimal do texto base64url, não dos bytes', () => {
    const { hash } = new GeradorDeTokenDeConviteNode().gerar();

    expect(hash).toBe(SHA256_HEX_DO_TEXTO_DO_TOKEN);
    expect(hash).not.toBe(SHA256_HEX_DOS_BYTES_DO_TOKEN);
  });
});
