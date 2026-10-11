export const BASE = 226;
const TOPO_PLOT = 46;
export const ESCALA = (BASE - TOPO_PLOT) / 120;
export const LARGURA_BARRA = 54;
export const PASSO_X = 96;

export const ESCALA_Y = [
  { y: 226, rotulo: '0' },
  { y: 181, rotulo: '30' },
  { y: 136, rotulo: '60' },
  { y: 91, rotulo: '90' },
  { y: 46, rotulo: '120' },
] as const;
