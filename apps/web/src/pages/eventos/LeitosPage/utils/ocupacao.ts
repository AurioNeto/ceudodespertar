import type { HospedeDoEvento, NoiteId } from '../mocks/leitos';
import type { Alocacao } from '../tipos';

/** Quantas noites cada pessoa ainda precisa. */
export const pendenciasDosHospedes = (lista: readonly HospedeDoEvento[], alocacao: Alocacao) =>
  lista.map((h) => {
    const alocadas = h.noites.filter((n) =>
      Object.values(alocacao).some((noites) => (noites[n] ?? []).includes(h.inscricaoId as string)),
    );
    return { hospede: h, faltam: h.noites.filter((n) => !alocadas.includes(n)) };
  });

export const vagasNoiteOcupadas = (alocacao: Alocacao) =>
  Object.values(alocacao).reduce(
    (s, n) => s + Object.values(n).reduce((x, pessoas) => x + pessoas.length, 0),
    0,
  );

export const noitesOcupadasDoLeito = (alocacao: Alocacao, leitoId: string) =>
  Object.values(alocacao[leitoId] ?? {}).filter((pessoas) => pessoas.length > 0).length;

export const comOcupante = (
  alocacao: Alocacao,
  leitoId: string,
  noite: NoiteId,
  inscricaoId: string,
): Alocacao => ({
  ...alocacao,
  [leitoId]: { ...(alocacao[leitoId] ?? {}), [noite]: [...(alocacao[leitoId]?.[noite] ?? []), inscricaoId] },
});

export const semOcupante = (
  alocacao: Alocacao,
  leitoId: string,
  noite: string,
  inscricaoId: string,
): Alocacao => {
  const noites = { ...(alocacao[leitoId] ?? {}) };
  const restantes = (noites[noite] ?? []).filter((x) => x !== inscricaoId);
  if (restantes.length === 0) delete noites[noite];
  else noites[noite] = restantes;
  return { ...alocacao, [leitoId]: noites };
};
