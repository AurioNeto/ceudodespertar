import { describe, expect, it } from 'vitest';
import { PERMISSOES } from '@cdd/contracts';

describe('resolução de @cdd/contracts pela fonte do workspace', () => {
  it('expõe o catálogo de permissões sem depender do dist compilado', () => {
    expect(PERMISSOES.length).toBeGreaterThan(0);
  });
});
