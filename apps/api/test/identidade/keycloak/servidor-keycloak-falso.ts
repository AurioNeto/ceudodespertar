import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Relogio } from '../../../src/shared/infrastructure/relogio.js';

export interface RequisicaoRecebida {
  readonly metodo: string;
  readonly caminho: string;
  readonly consultaBruta: string;
  readonly consulta: URLSearchParams;
  readonly cabecalhos: IncomingMessage['headers'];
  readonly corpo: string;
}

export interface RespostaFalsa {
  readonly status: number;
  readonly corpo?: unknown;
  readonly cabecalhos?: Readonly<Record<string, string>>;
  readonly atrasoEmMs?: number;
}

export type Roteiro = RespostaFalsa | ((requisicao: RequisicaoRecebida, indice: number) => RespostaFalsa);

export const CAMINHO_DO_TOKEN = '/realms/cdd/protocol/openid-connect/token';
export const CAMINHO_DOS_USUARIOS = '/admin/realms/cdd/users';

export class RelogioManual extends Relogio {
  constructor(private instante: Date = new Date('2026-10-09T12:00:00.000Z')) {
    super();
  }

  avancarEmMs(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }

  agora(): Date {
    return this.instante;
  }
}

export class ServidorKeycloakFalso {
  readonly requisicoes: RequisicaoRecebida[] = [];
  expiraEmSegundos = 300;
  private readonly roteiros = new Map<string, Roteiro>();
  private readonly servidor: Server;

  constructor() {
    this.definir('POST', CAMINHO_DO_TOKEN, (_requisicao, indice) => ({
      status: 200,
      corpo: { access_token: `token-${indice + 1}`, expires_in: this.expiraEmSegundos },
    }));
    this.servidor = createServer((requisicao, resposta) => {
      const partes: Buffer[] = [];
      requisicao.on('data', (parte: Buffer) => partes.push(parte));
      requisicao.on('end', () => {
        const recebida = this.registrar(requisicao, Buffer.concat(partes).toString('utf8'));
        const roteiro = this.roteiros.get(`${recebida.metodo} ${recebida.caminho}`);
        const indice = this.chamadasA(recebida.metodo, recebida.caminho).length - 1;
        const falsa = roteiro === undefined ? { status: 418 } : typeof roteiro === 'function' ? roteiro(recebida, indice) : roteiro;
        setTimeout(() => {
          if (resposta.destroyed) return;
          resposta.writeHead(falsa.status, { 'content-type': 'application/json', ...falsa.cabecalhos });
          resposta.end(falsa.corpo === undefined ? undefined : JSON.stringify(falsa.corpo));
        }, falsa.atrasoEmMs ?? 0);
      });
    });
  }

  async iniciar(): Promise<string> {
    await new Promise<void>((pronto) => this.servidor.listen(0, '127.0.0.1', pronto));
    return `http://127.0.0.1:${(this.servidor.address() as AddressInfo).port}`;
  }

  async derrubar(): Promise<void> {
    this.servidor.closeAllConnections();
    await new Promise<void>((pronto) => this.servidor.close(() => pronto()));
  }

  definir(metodo: string, caminho: string, roteiro: Roteiro): void {
    this.roteiros.set(`${metodo} ${caminho}`, roteiro);
  }

  chamadasA(metodo: string, caminho: string): RequisicaoRecebida[] {
    return this.requisicoes.filter((recebida) => recebida.metodo === metodo && recebida.caminho === caminho);
  }

  private registrar(requisicao: IncomingMessage, corpo: string): RequisicaoRecebida {
    const [caminho = '', consultaBruta = ''] = (requisicao.url ?? '').split('?');
    const recebida: RequisicaoRecebida = {
      metodo: requisicao.method ?? '',
      caminho,
      consultaBruta,
      consulta: new URLSearchParams(consultaBruta),
      cabecalhos: requisicao.headers,
      corpo,
    };
    this.requisicoes.push(recebida);
    return recebida;
  }
}
