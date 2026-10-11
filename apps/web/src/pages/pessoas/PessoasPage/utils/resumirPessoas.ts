import type { AcessoAoSistema, PessoaDaCasa } from '../mocks/pessoas';

export const resumirPessoas = (
  pessoas: readonly PessoaDaCasa[],
  acessos: Readonly<Record<number, AcessoAoSistema>>,
) => {
  const ativas = pessoas.filter((p) => p.ativa).length;
  const emDia = pessoas.filter((p) => p.anamnese === 'em dia').length;
  const pendentes = pessoas.filter((p) => p.anamnese !== 'em dia').length;
  const comAcesso = Object.keys(acessos).length;
  const comAcessoInativas = Object.keys(acessos).filter(
    (id) => !pessoas.find((p) => p.id === Number(id))?.ativa,
  ).length;
  return { ativas, emDia, pendentes, comAcesso, comAcessoInativas };
};
