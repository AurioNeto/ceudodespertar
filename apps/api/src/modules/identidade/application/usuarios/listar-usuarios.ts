import { Injectable } from '@nestjs/common';
import type { FiltroDeUsuarios, PaginaDeUsuarios } from '@cdd/contracts';
import { erroDeDominio, ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import {
  codificarCursorDeUsuarios,
  decodificarCursorDeUsuarios,
  ErroDeCursorDeUsuariosInvalido,
} from './cursor-de-usuarios.js';
import type { PosicaoDaListagem } from './cursor-de-usuarios.js';
import { LeitorDeUsuarios } from './leitor-de-usuarios.js';
import type { UsuarioComPosicao } from './leitor-de-usuarios.js';

function posicaoDoCursor(cursor: string | undefined): PosicaoDaListagem | null {
  if (cursor === undefined) return null;
  try {
    return decodificarCursorDeUsuarios(cursor);
  } catch (erro) {
    if (!(erro instanceof ErroDeCursorDeUsuariosInvalido)) throw erro;
    throw new ErroDeDominioException(
      erroDeDominio('CORPO_INVALIDO', { problemas: [{ caminho: 'depois', mensagem: erro.message }], total: 1 }),
    );
  }
}

function paginar(lidos: readonly UsuarioComPosicao[], limite: number): PaginaDeUsuarios {
  const pagina = lidos.slice(0, limite);
  const ultimo = pagina.at(-1);
  const haMais = lidos.length > limite && ultimo !== undefined;
  return {
    itens: pagina.map(({ usuario }) => usuario),
    proxima: haMais ? codificarCursorDeUsuarios(ultimo.posicao) : null,
  };
}

@Injectable()
export class ListarUsuarios {
  constructor(private readonly leitor: LeitorDeUsuarios) {}

  async executar(filtro: FiltroDeUsuarios): Promise<PaginaDeUsuarios> {
    const lidos = await this.leitor.ler({
      ...(filtro.situacao === undefined ? {} : { situacao: filtro.situacao }),
      ...(filtro.grupoId === undefined ? {} : { grupoId: filtro.grupoId }),
      ...(filtro.busca === undefined ? {} : { busca: filtro.busca }),
      depois: posicaoDoCursor(filtro.depois),
      limite: filtro.limite + 1,
    });
    return paginar(lidos, filtro.limite);
  }
}
