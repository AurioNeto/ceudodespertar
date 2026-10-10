export function normalizarEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}
