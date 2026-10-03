import { createHash } from 'node:crypto';

function ordenarChavesRecursivamente(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(ordenarChavesRecursivamente);
  }
  if (valor !== null && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    return Object.keys(objeto)
      .toSorted()
      .reduce<Record<string, unknown>>((acumulado, chave) => {
        acumulado[chave] = ordenarChavesRecursivamente(objeto[chave]);
        return acumulado;
      }, Object.create(null) as Record<string, unknown>);
  }
  return valor;
}

export function calcularHashDoCorpo(corpo: unknown): string {
  const corpoCanonico = JSON.stringify(ordenarChavesRecursivamente(corpo ?? null));
  return createHash('sha256').update(corpoCanonico).digest('hex');
}
