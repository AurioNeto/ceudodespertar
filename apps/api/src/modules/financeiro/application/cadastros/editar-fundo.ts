import { Injectable } from '@nestjs/common';
import type { Fundo as FundoDoContrato, FundoId, EditarFundo as ComandoEditarFundo } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { conferirVersao } from '../conferir-versao.js';
import { apresentarFundo } from './apresentacao-dos-cadastros.js';
import { conferirReferenciasDoFundo } from './conferir-referencias-do-fundo.js';

export interface ComandoDeEdicaoDoFundo extends ComandoEditarFundo {
  readonly fundoId: FundoId;
  readonly versaoEsperada: number;
}

@Injectable()
export class EditarFundo {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly fundos: RepositorioDeFundo,
    private readonly contas: RepositorioDeConta,
    private readonly categorias: RepositorioDeCategoria,
  ) {}

  executar(comando: ComandoDeEdicaoDoFundo): Promise<Result<FundoDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<FundoDoContrato, ErroDeDominio>> => {
      const encontrada = conferirVersao(await this.fundos.porId(comando.fundoId), comando.versaoEsperada);
      if (encontrada.tipo === 'erro') return encontrada;
      const fundo = encontrada.valor;
      const referencias = await conferirReferenciasDoFundo(this.contas, this.categorias, comando, {
        exigirAtiva: comando.contaVinculadaId !== fundo.contaVinculadaId,
      });
      if (referencias.tipo === 'erro') return referencias;
      const alterado = fundo.alterar(comando);
      if (alterado.tipo === 'erro') return alterado;
      return ok(apresentarFundo(fundo, await this.fundos.salvar(fundo)));
    });
  }
}
