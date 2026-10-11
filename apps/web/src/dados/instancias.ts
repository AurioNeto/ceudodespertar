import { criarClienteHttp } from './clienteHttp';
import { criarCredencialOidc } from './credencialOidc';
import { criarComando, criarConsulta } from './consultaEComando';
import { criarGerenciadorOidc, criarServicoDeEntrada, lerAmbienteOidc } from './oidc';

const gerenciadorOidc = criarGerenciadorOidc(lerAmbienteOidc(import.meta.env, window.location.origin));

export const credencial = criarCredencialOidc(gerenciadorOidc);
export const servicoDeEntrada = criarServicoDeEntrada(gerenciadorOidc);
export const clienteHttp = criarClienteHttp({ credencial });
export const consulta = criarConsulta(clienteHttp);
export const comando = criarComando(clienteHttp);
