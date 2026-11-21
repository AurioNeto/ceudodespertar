import { defineConfig } from '@mikro-orm/postgresql';
import type { Options } from '@mikro-orm/postgresql';
import { extrairConexaoExplicitaDaUrl } from '../../../banco/opcoes-do-migrador.js';
import { analisarAmbienteDoBanco } from './esquema-de-ambiente-do-banco.js';
import { instalarParsersDoPg } from './parsers-do-pg.js';
import { construirTlsDoBanco } from '../../../banco/tls-do-banco.js';

export function construirOpcoesDoOrm(bruto: NodeJS.ProcessEnv = process.env): Options {
  instalarParsersDoPg();

  const ambiente = analisarAmbienteDoBanco(bruto);
  const conexao = extrairConexaoExplicitaDaUrl(ambiente.BANCO_URL);

  return defineConfig({
    ...conexao,
    driverOptions: { ssl: construirTlsDoBanco(ambiente) },
    pool: { max: ambiente.BANCO_POOL_MAXIMO },
    allowGlobalContext: false,
    entities: [],
    discovery: { warnWhenNoEntities: false },
  });
}
