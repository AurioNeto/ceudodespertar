import type { Pergunta, RespostaHerdada } from '@cdd/contracts';
import { perguntaDaV3 } from '../mocks/inscricaoPublica';

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

export function alertaDaHerdada(herdada: RespostaHerdada): string | null {
  const pergunta = perguntaDaV3(herdada.perguntaId);
  return pergunta ? disparaAlerta(pergunta, herdada.valor) : null;
}
