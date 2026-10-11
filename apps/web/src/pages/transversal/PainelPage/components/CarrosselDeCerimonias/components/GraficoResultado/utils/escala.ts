const TOPO = 18;
const ALTURA = 132;
const MAX = 15500;
const MIN = -3000;

export const y = (v: number) => +(TOPO + ((MAX - v) / (MAX - MIN)) * ALTURA).toFixed(1);
export const x = (i: number) => +(56 + i * 106).toFixed(1);
