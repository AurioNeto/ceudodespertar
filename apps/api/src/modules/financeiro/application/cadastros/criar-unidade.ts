import { Injectable } from '@nestjs/common';
import type { CriarUnidade as ComandoCriarUnidade, Unidade as UnidadeDoContrato, UnidadeId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { Unidade } from '../../domain/unidade/unidade.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { apresentarUnidade } from './apresentacao-dos-cadastros.js';

@Injectable()
export class CriarUnidade {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly unidades: RepositorioDeUnidade,
  ) {}

  executar(comando: ComandoCriarUnidade): Promise<Result<UnidadeDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<UnidadeDoContrato, ErroDeDominio>> => {
      const criada = Unidade.criar({ ...comando, id: gerarUuidV7() as UnidadeId });
      if (criada.tipo === 'erro') return criada;

      await this.unidades.adicionar(criada.valor);
      return ok(apresentarUnidade(criada.valor));
    });
  }
}
