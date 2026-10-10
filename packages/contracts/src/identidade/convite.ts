import { z } from 'zod';
import { AlterarGruposDoUsuario, ConvidarUsuario } from '../comandos/identidade.js';
import type { UsuarioListado } from './listagem-de-usuarios.js';

export const PedidoDeConvite = ConvidarUsuario.extend({
  grupos: AlterarGruposDoUsuario.shape.grupos.optional(),
});

export type PedidoDeConvite = z.infer<typeof PedidoDeConvite>;

export type UsuarioConvidado = Omit<UsuarioListado, 'ultimoAcessoEm'>;

export interface ConviteReenviado {
  readonly versao: number;
}

export interface UsuarioAtivado {
  readonly situacao: 'ATIVO';
}
