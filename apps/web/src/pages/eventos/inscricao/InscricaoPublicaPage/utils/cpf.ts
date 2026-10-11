export const soDigitos = (v: string) => v.replace(/\D/g, '');

/** Máscara de CPF enquanto digita, sem brigar com quem cola o número inteiro. */
export function mascararCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join('.');
  return d.length > 9 ? `${p}-${d.slice(9)}` : p;
}

export function cpfValido(v: string): boolean {
  const digitos = soDigitos(v);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const digitoVerificador = (quantos: number) => {
    const soma = digitos
      .slice(0, quantos)
      .split('')
      .reduce((total, digito, posicao) => total + Number(digito) * (quantos + 1 - posicao), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digitoVerificador(9) === Number(digitos[9]) && digitoVerificador(10) === Number(digitos[10]);
}
