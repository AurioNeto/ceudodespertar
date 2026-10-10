import { clicar } from '@/testes/montagem';

export async function errosDurante(acao: () => Promise<void>): Promise<string[]> {
  const erros: string[] = [];
  const ouvir = (evento: ErrorEvent) => {
    evento.preventDefault();
    erros.push(evento.message);
  };
  window.addEventListener('error', ouvir);
  try {
    await acao();
  } finally {
    window.removeEventListener('error', ouvir);
  }
  return erros;
}

export const errosAoClicar = (alvo: HTMLElement): Promise<string[]> => errosDurante(() => clicar(alvo));

const PREFIXO_DA_CLASSE_DO_GLIFO = 'lucide-';

export const glifoDe = (icone: Element): string | undefined =>
  Array.from(icone.classList)
    .find((classe) => classe.startsWith(PREFIXO_DA_CLASSE_DO_GLIFO))
    ?.slice(PREFIXO_DA_CLASSE_DO_GLIFO.length);
