import { Client } from 'pg';

export function criarCliente(): Client {
  return new Client();
}
