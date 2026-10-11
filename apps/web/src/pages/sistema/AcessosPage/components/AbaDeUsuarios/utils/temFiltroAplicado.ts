import type { FiltroDaTela } from '../../../consultas';

export const temFiltroAplicado = (filtro: FiltroDaTela): boolean =>
  filtro.situacao !== null || filtro.grupoId !== null || filtro.busca.trim() !== '';
