import { useMemo, useState } from 'react';
import { acessos } from '../../../mocks/auditoria';
import type { Agrupamento } from '../../../tipos';
import { agruparAcessos } from '../utils/agruparAcessos';

export function useAcessosAgrupados() {
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('leitor');

  const leitores = new Set(acessos.map((a) => a.leitorNome)).size;
  const pessoas = new Set(acessos.map((a) => a.pessoaNome)).size;
  const semContexto = acessos.filter((a) => a.contexto === null).length;

  const grupos = useMemo(() => agruparAcessos(acessos, agrupamento), [agrupamento]);

  return { agrupamento, setAgrupamento, leituras: acessos.length, leitores, pessoas, semContexto, grupos };
}
