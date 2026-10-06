import { criarClienteHttp } from './clienteHttp';
import { fonteDeCredencialNula } from './credencial';
import { criarComando, criarConsulta } from './consultaEComando';

export const clienteHttp = criarClienteHttp({ credencial: fonteDeCredencialNula });
export const consulta = criarConsulta(clienteHttp);
export const comando = criarComando(clienteHttp);

export { criarClienteDeConsultas } from './clienteDeConsultas';
export { criarClienteHttp } from './clienteHttp';
export type { ClienteHttp, OpcoesDeRequisicao } from './clienteHttp';
export { fonteDeCredencialNula } from './credencial';
export type { FonteDeCredencial } from './credencial';
export { ErroDaApi, ErroDeRede } from './erros';
