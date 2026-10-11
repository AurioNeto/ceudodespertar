import { ROTAS, type RotaId } from '@/app/rotas';

const POR_CAMINHO = new Map<string, RotaId>(
  (Object.entries(ROTAS) as [RotaId, string][]).map(([id, caminho]) => [caminho, id]),
);

export function rotaAtiva(pathname: string): RotaId {
  const exata = POR_CAMINHO.get(pathname);
  if (exata) return exata;
  const prefixo = (Object.entries(ROTAS) as [RotaId, string][]).reduce<[RotaId, string] | null>(
    (maisLongo, atual) => {
      const [, caminho] = atual;
      if (caminho === '/' || !pathname.startsWith(caminho)) return maisLongo;
      return maisLongo === null || caminho.length > maisLongo[1].length ? atual : maisLongo;
    },
    null,
  );
  return prefixo?.[0] ?? 'painel';
}
