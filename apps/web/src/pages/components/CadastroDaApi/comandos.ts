import { criarComando, type ClienteHttp } from '@/dados';

interface Alteracao {
  readonly id: string;
  readonly versao: number;
  readonly dados: unknown;
}

export function comandosDoCadastro(cliente: ClienteHttp, caminho: string) {
  const comando = criarComando(cliente);
  return {
    criar: comando<unknown, unknown>({ metodo: 'POST', caminho, corpo: dados => dados }),
    editar: comando<Alteracao, unknown>({
      metodo: 'PUT', caminho: entrada => `${caminho}/${encodeURIComponent(entrada.id)}`,
      versao: entrada => entrada.versao, corpo: entrada => entrada.dados,
    }),
  };
}
