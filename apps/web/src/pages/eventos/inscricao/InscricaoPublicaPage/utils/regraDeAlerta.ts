import type { Pergunta } from '@cdd/contracts';

export const respondida = (v: string | undefined): boolean => (v ?? '').trim().length > 0;

export function disparaAlerta(p: Pergunta, valor: string | undefined): string | null {
  const regra = p.regraDeAlerta;
  if (!regra || !respondida(valor)) return null;
  const v = valor!.trim();
  if (regra.quando === 'PREENCHIDO') return regra.mensagem;
  if (regra.quando === 'IGUAL') return v === regra.valor ? regra.mensagem : null;
  if (regra.quando === 'DIFERENTE') return v !== regra.valor ? regra.mensagem : null;
  return null;
}
