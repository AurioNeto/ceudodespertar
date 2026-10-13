import { criarAtivacaoDeConvite } from './ativacaoDeConvite';
import { criarAvisoDeAcessoRecusado } from './avisoDeAcessoRecusado';
import { criarClienteHttp } from './clienteHttp';
import { criarCredencialOidc } from './credencialOidc';
import { criarComando, criarConsulta } from './consultaEComando';
import { criarGerenciadorOidc, criarServicoDeEntrada, lerAmbienteOidc } from './oidc';

const gerenciadorOidc = criarGerenciadorOidc(lerAmbienteOidc(import.meta.env, window.location.origin));

export const credencial = criarCredencialOidc(gerenciadorOidc);
export const servicoDeEntrada = criarServicoDeEntrada(gerenciadorOidc);
export const avisoDeAcessoRecusado = criarAvisoDeAcessoRecusado();
export const clienteHttp = criarClienteHttp({ credencial, aoAcessoRecusado: avisoDeAcessoRecusado.avisar });
export const ativacaoDeConvite = criarAtivacaoDeConvite({ clienteHttp });
export const consulta = criarConsulta(clienteHttp);
export const comando = criarComando(clienteHttp);
