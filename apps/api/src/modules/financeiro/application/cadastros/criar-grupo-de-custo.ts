import { Injectable } from '@nestjs/common';
import type { CriarGrupoDeCusto as ComandoCriarGrupoDeCusto, GrupoDeCusto as GrupoDeCustoDoContrato, GrupoDeCustoId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { GrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.js';
import { RepositorioDeGrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.repo.js';
import { apresentarGrupoDeCusto } from './apresentacao-dos-cadastros.js';

@Injectable()
export class CriarGrupoDeCusto {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly grupos: RepositorioDeGrupoDeCusto,
  ) {}

  executar(comando: ComandoCriarGrupoDeCusto): Promise<Result<GrupoDeCustoDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<GrupoDeCustoDoContrato, ErroDeDominio>> => {
      const grupo = GrupoDeCusto.criar({ ...comando, id: gerarUuidV7() as GrupoDeCustoId });

      await this.grupos.adicionar(grupo);
      return ok(apresentarGrupoDeCusto(grupo));
    });
  }
}
