import { connect, createServer } from 'node:net';
import type { AddressInfo, Server, Socket } from 'node:net';

const INTERVALO_DE_REPASSE_RETIDO_EM_MS = 20;

export interface ProxyCongelavel {
  readonly porta: number;
  conexoesRecebidas(): number;
  congelar(): void;
  descongelar(): void;
  fechar(): Promise<void>;
}

export async function abrirProxyCongelavel(hostDestino: string, portaDestino: number): Promise<ProxyCongelavel> {
  let congelado = false;
  let conexoesRecebidas = 0;
  const sockets = new Set<Socket>();
  const temporizadores = new Set<NodeJS.Timeout>();

  function repassarQuandoLiberado(destino: Socket, dados: Buffer): void {
    if (!congelado) {
      destino.write(dados);
      return;
    }
    const temporizador = setInterval(() => {
      if (!congelado) {
        clearInterval(temporizador);
        temporizadores.delete(temporizador);
        destino.write(dados);
      }
    }, INTERVALO_DE_REPASSE_RETIDO_EM_MS);
    temporizadores.add(temporizador);
  }

  function ligar(cliente: Socket): void {
    conexoesRecebidas += 1;
    const alvo = connect(portaDestino, hostDestino);
    for (const socket of [cliente, alvo]) {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    }
    cliente.on('data', (dados: Buffer) => repassarQuandoLiberado(alvo, dados));
    alvo.on('data', (dados: Buffer) => repassarQuandoLiberado(cliente, dados));
    cliente.on('error', () => alvo.destroy());
    alvo.on('error', () => cliente.destroy());
    cliente.on('close', () => alvo.destroy());
    alvo.on('close', () => cliente.destroy());
  }

  const servidor: Server = createServer(ligar);
  await new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', pronto));

  return {
    porta: (servidor.address() as AddressInfo).port,
    conexoesRecebidas: () => conexoesRecebidas,
    congelar: () => {
      congelado = true;
    },
    descongelar: () => {
      congelado = false;
    },
    fechar: async () => {
      congelado = false;
      for (const temporizador of temporizadores) {
        clearInterval(temporizador);
      }
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((fechado) => servidor.close(() => fechado()));
    },
  };
}
