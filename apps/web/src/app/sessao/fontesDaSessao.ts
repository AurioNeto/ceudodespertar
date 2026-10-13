import type { Eu } from '@cdd/contracts';
import type { AtivacaoDeConvite, AvisoDeAcessoRecusado, ClienteHttp, CredencialOidc, ServicoDeEntrada } from '@/dados';
import { carregarDemonstracao } from '@/app/demonstracao';
import type { SessaoProviderProps } from './SessaoProvider';

type FontesDaSessao = Omit<SessaoProviderProps, 'children'>;

interface InstanciasDaSessao {
  readonly clienteHttp: ClienteHttp;
  readonly credencial: CredencialOidc;
  readonly servicoDeEntrada: ServicoDeEntrada;
  readonly ativacaoDeConvite: AtivacaoDeConvite;
  readonly avisoDeAcessoRecusado: AvisoDeAcessoRecusado;
}

export function criarFontesReais({
  clienteHttp,
  credencial,
  servicoDeEntrada,
  ativacaoDeConvite,
  avisoDeAcessoRecusado,
}: InstanciasDaSessao): FontesDaSessao {
  return {
    entrada: servicoDeEntrada,
    aoEncerrar: credencial.aoEncerrar,
    aoAcessoRecusado: avisoDeAcessoRecusado.aoRecusar,
    guardarConvite: ativacaoDeConvite.guardar,
    async buscarEu(sinal) {
      await ativacaoDeConvite.ativarSeHouver();
      return clienteHttp.requisitar<Eu>({ metodo: 'GET', caminho: '/eu', sinal });
    },
  };
}

export async function escolherFontesDaSessao(fontesReais: FontesDaSessao): Promise<FontesDaSessao> {
  const demonstracao = import.meta.env.DEV
    ? await carregarDemonstracao({
        desenvolvimento: import.meta.env.DEV,
        flag: import.meta.env.VITE_SESSAO_DE_DEMONSTRACAO,
        importar: () => import('@/app/demonstracao/sessaoDeDemonstracao'),
      })
    : null;

  if (!demonstracao) return fontesReais;
  return {
    entrada: demonstracao.criarEntradaDeDemonstracao(),
    aoEncerrar: () => () => undefined,
    aoAcessoRecusado: () => () => undefined,
    guardarConvite: () => undefined,
    buscarEu: demonstracao.buscarEuDeDemonstracao,
  };
}
