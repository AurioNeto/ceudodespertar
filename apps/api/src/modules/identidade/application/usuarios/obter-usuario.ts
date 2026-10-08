import { Injectable } from '@nestjs/common';
import type { UsuarioId, UsuarioListado } from '@cdd/contracts';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { LeitorDeUsuarios } from './leitor-de-usuarios.js';

@Injectable()
export class ObterUsuario {
  constructor(private readonly leitor: LeitorDeUsuarios) {}

  async executar(usuarioId: UsuarioId): Promise<Result<UsuarioListado, ErroDeDominio>> {
    const [lido] = await this.leitor.ler({
      usuarioId,
      depois: null,
      limite: 1,
    });
    return lido === undefined ? err(erroDeDominio('RECURSO_NAO_ENCONTRADO')) : ok(lido.usuario);
  }
}
