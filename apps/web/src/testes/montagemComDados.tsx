import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onTestFinished } from 'vitest';
import type { CodigoDeErro } from '@cdd/contracts';
import { ClienteHttpProvider } from '@/app/providers';
import { SessaoProvider } from '@/app/sessao';
import { criarClienteHttp, fonteDeCredencialNula, JANELA_DE_FRESCOR_EM_MS } from '@/dados';
import type { ClienteHttp, OpcoesDeRequisicao } from '@/dados';
import { montar } from './montagem';
import type { Montado } from './montagem';
import { assentar, criarAvisoDeEncerramentoFalso } from './sessaoDeTeste';
import type { CenarioDeSessao } from './sessaoDeTeste';

export type RotaDeTeste = `${OpcoesDeRequisicao['metodo']} /${string}`;

export interface RespostaDeTeste {
  readonly status: number;
  readonly corpo?: unknown;
}

export interface ChamadaRegistrada {
  readonly metodo: string;
  readonly caminho: string;
  readonly corpo: unknown;
  readonly cabecalhos: Readonly<Record<string, string>>;
}

export type RespostaDeclarada = RespostaDeTeste | ((chamada: ChamadaRegistrada) => RespostaDeTeste);

export type RespostasDeTeste = Readonly<Partial<Record<RotaDeTeste, RespostaDeclarada>>>;

export interface ApiDeTeste {
  readonly cliente: ClienteHttp;
  chamadas(): readonly ChamadaRegistrada[];
  retirarRotasNaoDeclaradas(): string[];
}

export interface OpcoesDaApiDeTeste {
  readonly aoAcessoRecusado?: () => void;
}

export interface OpcoesDaMontagemComDados {
  readonly sessao?: CenarioDeSessao;
}

export interface MontadoComDados extends Montado {
  readonly api: ApiDeTeste;
  readonly clienteDeConsultas: QueryClient;
}

const STATUS_DE_SUCESSO = 200;
const STATUS_SEM_CORPO: ReadonlySet<number> = new Set([204, 205, 304]);

export const responder = (corpo?: unknown, status = STATUS_DE_SUCESSO): RespostaDeTeste => ({ status, corpo });

export const recusar = (
  status: number,
  erro: CodigoDeErro,
  detalhes?: Record<string, unknown>,
): RespostaDeTeste => ({ status, corpo: detalhes ? { erro, detalhes } : { erro } });

const rotaDe = (metodo: string, caminho: string) => `${metodo} /${caminho.replace(/^\/+/, '')}`;

function mensagemDeRotaNaoDeclarada(rota: string, respostas: RespostasDeTeste): string {
  const declaradas = Object.keys(respostas);
  const lista = declaradas.length > 0 ? declaradas.join(', ') : 'nenhuma';
  return `rota não declarada no teste: ${rota} (declaradas: ${lista})`;
}

function lerCorpo(corpo: RequestInit['body']): unknown {
  return typeof corpo === 'string' ? JSON.parse(corpo) : undefined;
}

function respostaHttp(resposta: RespostaDeTeste): Response {
  const semCorpo = resposta.corpo === undefined || STATUS_SEM_CORPO.has(resposta.status);
  return new Response(semCorpo ? null : JSON.stringify(resposta.corpo), { status: resposta.status });
}

export function criarApiDeTeste(respostas: RespostasDeTeste, opcoes: OpcoesDaApiDeTeste = {}): ApiDeTeste {
  const chamadas: ChamadaRegistrada[] = [];
  let naoDeclaradas: string[] = [];
  let chavesGeradas = 0;
  const declaradaPara = (rota: string) => respostas[rota as RotaDeTeste];

  const buscar = (caminho: string, init: RequestInit): Promise<Response> => {
    const chamada: ChamadaRegistrada = {
      metodo: init.method ?? 'GET',
      caminho,
      corpo: lerCorpo(init.body),
      cabecalhos: { ...(init.headers as Record<string, string>) },
    };
    chamadas.push(chamada);
    const declarada = declaradaPara(rotaDe(chamada.metodo, caminho)) as RespostaDeclarada;
    return Promise.resolve(respostaHttp(typeof declarada === 'function' ? declarada(chamada) : declarada));
  };

  const real = criarClienteHttp({
    credencial: fonteDeCredencialNula,
    base: '',
    fetch: buscar as typeof globalThis.fetch,
    gerarChave: () => `chave-de-teste-${++chavesGeradas}`,
    ...(opcoes.aoAcessoRecusado ? { aoAcessoRecusado: opcoes.aoAcessoRecusado } : {}),
  });

  return {
    cliente: {
      requisitar<Saida>(requisicao: OpcoesDeRequisicao): Promise<Saida> {
        const rota = rotaDe(requisicao.metodo, requisicao.caminho);
        if (!declaradaPara(rota)) {
          naoDeclaradas.push(rota);
          return Promise.reject(new Error(mensagemDeRotaNaoDeclarada(rota, respostas)));
        }
        return real.requisitar<Saida>(requisicao);
      },
    },
    chamadas: () => [...chamadas],
    retirarRotasNaoDeclaradas() {
      const retiradas = naoDeclaradas;
      naoDeclaradas = [];
      return retiradas;
    },
  };
}

function criarClienteDeConsultasDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: JANELA_DE_FRESCOR_EM_MS, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
}

export function falharSeSobrouRotaNaoDeclarada(api: ApiDeTeste): void {
  const sobra = api.retirarRotasNaoDeclaradas();
  if (sobra.length > 0) throw new Error(`a tela chamou rota não declarada no teste: ${sobra.join(', ')}`);
}

function envolverComSessao(cenario: CenarioDeSessao, recusa: ReturnType<typeof criarAvisoDeEncerramentoFalso>) {
  const aviso = cenario.aviso ?? criarAvisoDeEncerramentoFalso();
  return (conteudo: ReactElement) => (
    <SessaoProvider
      entrada={cenario.entrada}
      aoEncerrar={aviso.aoEncerrar}
      aoAcessoRecusado={recusa.aoEncerrar}
      buscarEu={cenario.buscarEu}
      guardarConvite={cenario.guardarConvite ?? (() => undefined)}
    >
      {conteudo}
    </SessaoProvider>
  );
}

export async function montarComDados(
  arvore: ReactElement,
  respostas: RespostasDeTeste,
  opcoes: OpcoesDaMontagemComDados = {},
): Promise<MontadoComDados> {
  const recusa = opcoes.sessao?.recusa ?? criarAvisoDeEncerramentoFalso();
  const api = criarApiDeTeste(respostas, { aoAcessoRecusado: () => recusa.disparar() });
  const clienteDeConsultas = criarClienteDeConsultasDeTeste();
  const comSessao = opcoes.sessao ? envolverComSessao(opcoes.sessao, recusa) : (conteudo: ReactElement) => conteudo;
  const envolver = (conteudo: ReactElement) => (
    <QueryClientProvider client={clienteDeConsultas}>
      {comSessao(<ClienteHttpProvider cliente={api.cliente}>{conteudo}</ClienteHttpProvider>)}
    </QueryClientProvider>
  );
  onTestFinished(() => falharSeSobrouRotaNaoDeclarada(api));

  const montado = await montar(envolver(arvore));
  await assentar();
  return {
    container: montado.container,
    api,
    clienteDeConsultas,
    async atualizar(proxima) {
      await montado.atualizar(envolver(proxima));
      await assentar();
    },
    desmontar: () => montado.desmontar(),
  };
}
