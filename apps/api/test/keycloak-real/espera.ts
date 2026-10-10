const INTERVALO_PADRAO_EM_MS = 250;
const PRAZO_PADRAO_EM_MS = 30_000;

function pausar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

export async function aguardarAte<T>(
  descricao: string,
  sonda: () => Promise<T | undefined>,
  prazoEmMs = PRAZO_PADRAO_EM_MS,
): Promise<T> {
  const limite = Date.now() + prazoEmMs;
  let resultado = await sonda();
  while (resultado === undefined && Date.now() < limite) {
    // eslint-disable-next-line no-await-in-loop -- polling até a condição valer
    await pausar(INTERVALO_PADRAO_EM_MS);
    // eslint-disable-next-line no-await-in-loop -- polling até a condição valer
    resultado = await sonda();
  }
  if (resultado === undefined) throw new Error(`condição não atendida em ${prazoEmMs} ms: ${descricao}`);
  return resultado;
}
