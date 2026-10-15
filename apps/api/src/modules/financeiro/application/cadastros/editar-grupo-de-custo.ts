import { Injectable } from '@nestjs/common';
import type {
  EditarGrupoDeCusto as ComandoEditarGrupoDeCusto,
  GrupoDeCusto as GrupoDeCustoDoContrato,
  GrupoDeCustoId,
} from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeGrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.repo.js';
import { conferirVersao } from '../conferir-versao.js';
import { apresentarGrupoDeCusto } from './apresentacao-dos-cadastros.js';

export interface ComandoDeEdicaoDoGrupoDeCusto extends ComandoEditarGrupoDeCusto {
  readonly grupoDeCustoId: GrupoDeCustoId;
  readonly versaoEsperada: number;
}

@Injectable()
export class EditarGrupoDeCusto {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly grupos: RepositorioDeGrupoDeCusto,
  ) {}

  executar({
    grupoDeCustoId,
    versaoEsperada,
    ...alteracao
  }: ComandoDeEdicaoDoGrupoDeCusto): Promise<Result<GrupoDeCustoDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<GrupoDeCustoDoContrato, ErroDeDominio>> => {
      const encontrado = conferirVersao(await this.grupos.porId(grupoDeCustoId), versaoEsperada);
      if (encontrado.tipo === 'erro') return encontrado;
      const grupo = encontrado.valor;

      grupo.alterar(alteracao);
      return ok(apresentarGrupoDeCusto(grupo, await this.grupos.salvar(grupo)));
    });
  }
}
