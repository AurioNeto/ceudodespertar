import type { PessoaDaCasa } from '../mocks/pessoas';

export const filtrarPessoas = (pessoas: readonly PessoaDaCasa[], filtro: string, busca: string) => {
  const texto = busca.trim().toLowerCase();

  return pessoas.filter((p) => {
    if (filtro === 'ativos' && !p.ativa) return false;
    if (filtro === 'pendentes' && p.anamnese === 'em dia') return false;
    if (filtro !== 'todos' && filtro !== 'ativos' && filtro !== 'pendentes' && p.vinculo !== filtro) return false;
    if (texto && ![p.nome, p.cidade, p.telefone].join(' ').toLowerCase().includes(texto)) return false;
    return true;
  });
};
