import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoriaDoPlano, CategoriaId } from '@cdd/contracts';
import { ErroDaApi } from '@/dados';
import { pluralizar } from '@/pages/utils/formato';
import { useComandosDeParametros } from '../comandos';
import { SEM_LINHA_ESCOLHIDA, type Aba } from '../constantes';
import { CHAVE_DAS_CATEGORIAS, useConsultasDeParametros, type ListaDoPlano } from '../consultas';
import { mensagemDeErro } from '../utils/mensagemDeErro';

const SEM_ITENS: readonly never[] = [];

const ehVersaoDesatualizada = (erro: unknown): boolean =>
  erro instanceof ErroDaApi && erro.codigo === 'VERSAO_DESATUALIZADA';

export function useCorrecaoDeLinha() {
  const clienteDeConsultas = useQueryClient();
  const consultas = useConsultasDeParametros();
  const comandos = useComandosDeParametros();
  const [aba, setAba] = useState<Aba>('categorias');
  const consultaDeCategorias = useQuery({ ...consultas.categorias(), enabled: aba === 'categorias' });
  const consultaDeUnidades = useQuery({ ...consultas.unidades(), enabled: aba === 'unidades' });
  const [editando, setEditando] = useState<CategoriaId | null>(null);
  const sessaoDeEdicao = useRef(0);
  const [linhaEscolhida, setLinhaEscolhida] = useState(SEM_LINHA_ESCOLHIDA);
  const [recado, setRecado] = useState<string | null>(null);
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const emEnvio = useRef(false);

  const categorias = consultaDeCategorias.data?.itens ?? SEM_ITENS;
  const unidades = consultaDeUnidades.data?.itens ?? SEM_ITENS;
  const semLinha = categorias.filter((c) => c.ativa && !c.linhaRelatorio);
  const semRegime = unidades.filter((u) => u.ativa && u.regime === null);

  const abrirEdicaoDe = (id: CategoriaId | null) => {
    sessaoDeEdicao.current += 1;
    setEditando(id);
  };

  const gravarNaListagem = (atualizada: CategoriaDoPlano) =>
    clienteDeConsultas.setQueryData<ListaDoPlano<CategoriaDoPlano>>(CHAVE_DAS_CATEGORIAS, (lista) =>
      lista ? { itens: lista.itens.map((x) => (x.id === atualizada.id ? atualizada : x)) } : lista,
    );

  const refazerListagem = () => clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DAS_CATEGORIAS });

  const corrigir = async (c: CategoriaDoPlano) => {
    if (emEnvio.current) return;
    emEnvio.current = true;
    const sessao = sessaoDeEdicao.current;
    setSalvando(true);
    setErroAoSalvar(null);
    try {
      const atualizada = await comandos.corrigirLinha({ categoria: c, linhaRelatorio: linhaEscolhida });
      gravarNaListagem(atualizada);
      if (sessaoDeEdicao.current !== sessao) return;
      abrirEdicaoDe(null);
      setRecado(
        `“${c.nome}” agora aparece em ${linhaEscolhida}. ${pluralizar(c.lancamentos, 'lançamento')} que estavam fora do relatório entraram.`,
      );
    } catch (falha) {
      if (ehVersaoDesatualizada(falha)) void refazerListagem();
      if (sessaoDeEdicao.current === sessao) setErroAoSalvar(mensagemDeErro(falha));
    } finally {
      emEnvio.current = false;
      setSalvando(false);
    }
  };

  const escolherAba = (v: Aba) => {
    setAba(v);
    abrirEdicaoDe(null);
    setRecado(null);
    setErroAoSalvar(null);
  };

  const fecharRecado = () => setRecado(null);

  const editar = (c: CategoriaDoPlano) => {
    abrirEdicaoDe(c.id);
    setErroAoSalvar(null);
    setLinhaEscolhida(c.linhaRelatorio ?? SEM_LINHA_ESCOLHIDA);
  };

  const cancelar = () => {
    abrirEdicaoDe(null);
    setErroAoSalvar(null);
  };

  return {
    aba,
    escolherAba,
    consultaDeCategorias,
    consultaDeUnidades,
    categorias,
    unidades,
    editando,
    linhaEscolhida,
    setLinhaEscolhida,
    recado,
    fecharRecado,
    erroAoSalvar,
    salvando,
    semLinha,
    semRegime,
    editar,
    cancelar,
    corrigir,
  };
}
