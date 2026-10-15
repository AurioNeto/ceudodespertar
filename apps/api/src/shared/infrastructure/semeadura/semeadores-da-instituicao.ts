import { Injectable } from '@nestjs/common';
import type { SemeadorDaInstituicao } from './semeador-da-instituicao.js';

@Injectable()
export class SemeadoresDaInstituicao {
  readonly #semeadores: SemeadorDaInstituicao[] = [];

  registrar(semeador: SemeadorDaInstituicao): void {
    if (!this.#semeadores.includes(semeador)) this.#semeadores.push(semeador);
  }

  async semear(instituicaoId: string): Promise<void> {
    for (const semeador of this.#semeadores) {
      // eslint-disable-next-line no-await-in-loop -- cada semeador roda na transação aberta, em ordem
      await semeador.semear(instituicaoId);
    }
  }
}
