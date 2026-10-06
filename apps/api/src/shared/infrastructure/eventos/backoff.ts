const BASE_DO_BACKOFF_EM_MS = 1000;
const TETO_DO_BACKOFF_EM_MS = 5 * 60 * 1000;
const EXPOENTE_DA_BASE = 2;

export function calcularProximaTentativa(tentativas: number, agora: Date): Date {
  const atrasoEmMs = Math.min(
    BASE_DO_BACKOFF_EM_MS * EXPOENTE_DA_BASE ** (tentativas - 1),
    TETO_DO_BACKOFF_EM_MS,
  );
  return new Date(agora.getTime() + atrasoEmMs);
}
