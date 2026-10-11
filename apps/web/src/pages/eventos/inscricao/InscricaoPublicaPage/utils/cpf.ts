export const soDigitos = (v: string) => v.replace(/\D/g, '');

/** Máscara de CPF enquanto digita, sem brigar com quem cola o número inteiro. */
export function mascararCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join('.');
  return d.length > 9 ? `${p}-${d.slice(9)}` : p;
}
