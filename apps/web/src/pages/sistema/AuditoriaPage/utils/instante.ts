/** `2026-09-02T09:58:00-03:00` → `09:58`. As fixtures já vêm no fuso da casa. */
export const hora = (em: string): string => em.slice(11, 16);
export const dia = (em: string): string => em.slice(0, 10);

export const MS_MINUTO = 60_000;
