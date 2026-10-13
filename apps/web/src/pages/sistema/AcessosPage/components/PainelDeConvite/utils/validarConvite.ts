import { ConvidarUsuario } from '@cdd/contracts';

export interface ErrosDeCampo {
  readonly nome?: string;
  readonly email?: string;
}

export function validarConvite(nome: string, email: string): ErrosDeCampo {
  const resultado = ConvidarUsuario.safeParse({ nome, email });
  if (resultado.success) return {};
  const camposInvalidos = new Set(resultado.error.issues.map((problema) => problema.path[0]));
  return {
    ...(camposInvalidos.has('nome') ? { nome: 'Informe o nome.' } : {}),
    ...(camposInvalidos.has('email') ? { email: 'Informe um e-mail válido.' } : {}),
  };
}
