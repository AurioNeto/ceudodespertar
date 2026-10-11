import { useState } from 'react';
import type { CategoriaId } from '@cdd/contracts';
import { pluralizar } from '@/pages/utils/formato';
import type { Aba } from '../constantes';
import {
  categorias as categoriasIniciais,
  LINHAS_DE_RELATORIO,
  unidades,
  type CategoriaDoPlano,
} from '../mocks/parametros';

export function useCorrecaoDeLinha() {
  const [aba, setAba] = useState<Aba>('categorias');
  const [categorias, setCategorias] = useState<readonly CategoriaDoPlano[]>(categoriasIniciais);
  const [editando, setEditando] = useState<CategoriaId | null>(null);
  const [linhaEscolhida, setLinhaEscolhida] = useState(LINHAS_DE_RELATORIO[0]!);
  const [recado, setRecado] = useState<string | null>(null);

  const semLinha = categorias.filter((c) => c.ativa && !c.linhaRelatorio);
  const semRegime = unidades.filter((u) => u.ativa && u.regime === null);

  const corrigir = (c: CategoriaDoPlano) => {
    setCategorias((lista) =>
      lista.map((x) => (x.id === c.id ? { ...x, linhaRelatorio: linhaEscolhida } : x)),
    );
    setEditando(null);
    setRecado(
      `“${c.nome}” agora aparece em ${linhaEscolhida}. ${pluralizar(c.lancamentos, 'lançamento')} que estavam fora do relatório entraram.`,
    );
  };

  const escolherAba = (v: Aba) => {
    setAba(v);
    setEditando(null);
    setRecado(null);
  };

  const fecharRecado = () => setRecado(null);

  const editar = (c: CategoriaDoPlano) => {
    setEditando(c.id);
    setLinhaEscolhida(c.linhaRelatorio ?? LINHAS_DE_RELATORIO[0]!);
  };

  const cancelar = () => setEditando(null);

  return {
    aba,
    escolherAba,
    categorias,
    editando,
    linhaEscolhida,
    setLinhaEscolhida,
    recado,
    fecharRecado,
    semLinha,
    semRegime,
    editar,
    cancelar,
    corrigir,
  };
}
