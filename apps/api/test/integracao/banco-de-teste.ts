import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { inject } from 'vitest';

export interface BancoDeTeste {
  readonly nomeDoBanco: string;
  readonly owner: Client;
  readonly app: Client;
}

function nomeDeBancoUnico(): string {
  return `cdd_teste_${randomUUID().replaceAll('-', '')}`;
}

async function conectarComoSuperusuario(): Promise<Client> {
  const cliente = new Client({
    host: inject('hostDoBanco'),
    port: inject('portaDoBanco'),
    user: inject('usuarioSuperusuario'),
    password: inject('senhaSuperusuario'),
    database: inject('bancoDeAdministracao'),
  });
  await cliente.connect();
  return cliente;
}

export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const nomeDoBanco = nomeDeBancoUnico();

  const superusuario = await conectarComoSuperusuario();
  try {
    await superusuario.query(
      `CREATE DATABASE ${nomeDoBanco} TEMPLATE ${inject('bancoModelo')} OWNER cdd_owner`,
    );
  } finally {
    await superusuario.end();
  }

  const conexaoComum = { host: inject('hostDoBanco'), port: inject('portaDoBanco'), database: nomeDoBanco };
  const owner = new Client({ ...conexaoComum, user: 'cdd_owner', password: inject('senhaCddOwner') });
  const app = new Client({ ...conexaoComum, user: 'cdd_app', password: inject('senhaCddApp') });
  await Promise.all([owner.connect(), app.connect()]);

  return { nomeDoBanco, owner, app };
}

export async function derrubarBancoDeTeste(banco: BancoDeTeste): Promise<void> {
  await Promise.all([banco.owner.end(), banco.app.end()]);

  const superusuario = await conectarComoSuperusuario();
  try {
    await superusuario.query(`DROP DATABASE IF EXISTS ${banco.nomeDoBanco}`);
  } finally {
    await superusuario.end();
  }
}
