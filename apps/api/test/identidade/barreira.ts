export interface Barreira {
  aguardar(): Promise<void>;
}

export function criarBarreira(participantes: number): Barreira {
  let chegadas = 0;
  let abrir: () => void = () => undefined;
  const aberta = new Promise<void>((resolver) => {
    abrir = resolver;
  });
  return {
    async aguardar() {
      chegadas += 1;
      if (chegadas === participantes) abrir();
      await aberta;
    },
  };
}
