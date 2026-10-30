import { Injectable } from '@nestjs/common';
import type { FiltroDePessoas, PaginaDePessoas } from '@cdd/contracts';
import { erroDeDominio, ErroDeDominioException } from '../../../shared/kernel/erro-de-dominio.js';
import { detalhesDeCorpoInvalido } from '../../../shared/kernel/problemas-de-validacao.js';
import {
  codificarCursorDePessoas,
  decodificarCursorDePessoas,
  ErroDeCursorDePessoasInvalido,
} from './cursor-de-pessoas.js';
import type { PosicaoDaListagem } from './cursor-de-pessoas.js';
import { LeitorDePessoas } from './leitor-de-pessoas.js';
import type { PessoaComPosicao } from './leitor-de-pessoas.js';

const REGRA_DO_CURSOR_INVALIDO = 'formato';

function posicaoDoCursor(cursor: string | undefined): PosicaoDaListagem | null {
  if (cursor === undefined) return null;
  try {
    return decodificarCursorDePessoas(cursor);
  } catch (erro) {
    if (!(erro instanceof ErroDeCursorDePessoasInvalido)) throw erro;
    throw new ErroDeDominioException(
      erroDeDominio('CORPO_INVALIDO', detalhesDeCorpoInvalido([{ caminho: 'depois', regra: REGRA_DO_CURSOR_INVALIDO }])),
    );
  }
}

function paginar(lidos: readonly PessoaComPosicao[], limite: number): PaginaDePessoas {
  const pagina = lidos.slice(0, limite);
  const ultimo = pagina.at(-1);
  const haMais = lidos.length > limite && ultimo !== undefined;
  return {
    itens: pagina.map(({ pessoa }) => pessoa),
    proxima: haMais ? codificarCursorDePessoas(ultimo.posicao) : null,
  };
}

@Injectable()
export class ListarPessoas {
  constructor(private readonly leitor: LeitorDePessoas) {}

  async executar(filtro: FiltroDePessoas): Promise<PaginaDePessoas> {
    const lidos = await this.leitor.ler({
      ...(filtro.busca === undefined ? {} : { busca: filtro.busca }),
      depois: posicaoDoCursor(filtro.depois),
      limite: filtro.limite + 1,
    });
    return paginar(lidos, filtro.limite);
  }
}
