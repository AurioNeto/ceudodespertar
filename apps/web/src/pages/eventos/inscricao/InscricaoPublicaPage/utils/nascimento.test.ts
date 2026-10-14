import { dataLocal } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { MENSAGEM_DE_MENOR_PELO_LINK, MENSAGEM_DE_NASCIMENTO_INVALIDO } from '../constantes';
import { erroDoNascimento } from './nascimento';

const LUA_CHEIA = dataLocal('2026-09-12');

describe('erroDoNascimento — a idade é medida no dia do evento', () => {
  it('faz 18 entre o hoje da demonstração e o evento — aceita', () => {
    expect(erroDoNascimento('10/09/2008', LUA_CHEIA)).toBeUndefined();
  });

  it('faz 18 no próprio dia do evento — aceita', () => {
    expect(erroDoNascimento('12/09/2008', LUA_CHEIA)).toBeUndefined();
  });

  it('faz 18 depois do evento — recusa como menor', () => {
    expect(erroDoNascimento('13/09/2008', LUA_CHEIA)).toBe(MENSAGEM_DE_MENOR_PELO_LINK);
  });

  it('nascimento depois do hoje da demonstração — recusa como data inválida', () => {
    expect(erroDoNascimento('05/09/2026', LUA_CHEIA)).toBe(MENSAGEM_DE_NASCIMENTO_INVALIDO);
  });
});
