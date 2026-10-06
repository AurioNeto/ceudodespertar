import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { JSONWebKeySet } from 'jose';

export type ModoDoJwks = 'responde' | 'indisponivel' | 'pendurado' | 'corpo-invalido';

export class ServidorDeJwks {
  modo: ModoDoJwks = 'responde';
  pedidos = 0;
  private servidor: Server | undefined;
  private porta = 0;

  constructor(public conjunto: JSONWebKeySet) {}

  get emissor(): string {
    return `http://127.0.0.1:${this.porta}/realms/cdd`;
  }

  async iniciar(): Promise<void> {
    const servidor = createServer((_requisicao, resposta) => {
      this.pedidos += 1;
      if (this.modo === 'pendurado') return;
      if (this.modo === 'indisponivel') {
        resposta.statusCode = 503;
        resposta.end();
        return;
      }
      resposta.setHeader('content-type', 'application/json');
      resposta.end(this.modo === 'corpo-invalido' ? JSON.stringify({ chaves: [] }) : JSON.stringify(this.conjunto));
    });
    this.servidor = servidor;
    await new Promise<void>((resolver) => servidor.listen(this.porta, '127.0.0.1', resolver));
    this.porta = (servidor.address() as AddressInfo).port;
  }

  async derrubar(): Promise<void> {
    const servidor = this.servidor;
    if (servidor === undefined) return;
    this.servidor = undefined;
    servidor.closeAllConnections();
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  }
}
