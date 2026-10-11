import { eventoDoMapa } from '../mocks/leitos';

export const rotuloDaNoite = (n: string) => eventoDoMapa.noites.find((x) => x.chave === n)?.rotulo ?? n;
