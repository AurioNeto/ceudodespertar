import 'reflect-metadata';
import { abrirContextoDoCli } from './contexto-do-cli.js';
import { CODIGO_DE_SUCESSO } from './codigos-de-saida.js';
import { executarCli } from './executar-cli.js';

const PRAZO_PARA_FORCAR_A_SAIDA_EM_FALHA_EM_MS = 5_000;

export async function executarNoProcesso(argumentos: readonly string[]): Promise<void> {
  const saida = await executarCli(argumentos, abrirContextoDoCli, process.env);
  for (const linha of saida.stdout) process.stdout.write(`${linha}\n`);
  for (const linha of saida.stderr) process.stderr.write(`${linha}\n`);
  process.exitCode = saida.codigoDeSaida;
  if (saida.codigoDeSaida !== CODIGO_DE_SUCESSO) {
    setTimeout(() => process.exit(saida.codigoDeSaida), PRAZO_PARA_FORCAR_A_SAIDA_EM_FALHA_EM_MS).unref();
  }
}
