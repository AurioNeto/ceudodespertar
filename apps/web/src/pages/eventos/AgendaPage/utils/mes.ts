export const mesDeslocado = (ano: number, mes: number, delta: number) => {
  const i = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(i / 12), mes: (i % 12) + 1 };
};
