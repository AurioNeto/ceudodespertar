/**
 * Política de senha do primeiro acesso e da redefinição.
 *
 * A checagem aqui é cortesia com quem digita — mostrar a regra antes do envio,
 * não depois. Quem manda de verdade é o Keycloak (Doc 1 §4.4): se a política de
 * lá mudar, é lá que ela muda, e este arquivo acompanha.
 */

export interface RegraDeSenha {
  readonly rotulo: string;
  readonly atende: boolean;
}

export function regrasDaSenha(senha: string): readonly RegraDeSenha[] {
  return [
    { rotulo: 'pelo menos 10 caracteres', atende: senha.length >= 10 },
    { rotulo: 'uma letra', atende: /\p{L}/u.test(senha) },
    { rotulo: 'um número', atende: /\d/.test(senha) },
  ];
}

export const senhaAceita = (senha: string): boolean => regrasDaSenha(senha).every((r) => r.atende);

/**
 * Por que o botão de salvar está bloqueado — ou `undefined` quando ainda não há
 * o que cobrar. Formulário em branco não leva bronca: a exigência aparece
 * quando a pessoa começa a digitar, não quando ela chega na tela.
 */
export function motivoDoBloqueio(senha: string, repetida: string): string | undefined {
  if (senha.length === 0) return undefined;
  if (!senhaAceita(senha)) return 'A senha ainda não atende às exigências acima.';
  if (repetida.length > 0 && senha !== repetida) return 'A repetição precisa ser igual à senha.';
  return undefined;
}
