import type { RegistroDeAcesso } from '@cdd/contracts';
import { MS_MINUTO } from '../../../utils/instante';

/**
 * Rajada: três ou mais leituras dentro de quinze minutos. Não é irregularidade
 * — revisar a fila é trabalho legítimo. É o tipo de padrão que a Governança
 * quer enxergar sem ter que contar linha a linha.
 */
export function rajada(registros: readonly RegistroDeAcesso[]): { leituras: number; minutos: number } | null {
  const instantes = registros.map((r) => new Date(r.em).getTime()).toSorted((a, b) => a - b);
  let melhor: { leituras: number; minutos: number } | null = null;
  for (let i = 0; i < instantes.length; i += 1) {
    let j = i;
    while (j + 1 < instantes.length && instantes[j + 1]! - instantes[i]! <= 15 * MS_MINUTO) j += 1;
    const leituras = j - i + 1;
    if (leituras >= 3 && (melhor === null || leituras > melhor.leituras)) {
      melhor = { leituras, minutos: Math.max(1, Math.round((instantes[j]! - instantes[i]!) / MS_MINUTO)) };
    }
  }
  return melhor;
}
