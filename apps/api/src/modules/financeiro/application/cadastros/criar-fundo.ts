import { Injectable } from '@nestjs/common';
import type { Fundo as FundoDoContrato, FundoId, CriarFundo as ComandoCriarFundo } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { Fundo } from '../../domain/fundo/fundo.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { apresentarFundo } from './apresentacao-dos-cadastros.js';
import { conferirReferenciasDoFundo } from './conferir-referencias-do-fundo.js';

@Injectable()
export class CriarFundo {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly fundos: RepositorioDeFundo,
    private readonly contas: RepositorioDeConta,
    private readonly categorias: RepositorioDeCategoria,
  ) {}

  executar(comando: ComandoCriarFundo): Promise<Result<FundoDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<FundoDoContrato, ErroDeDominio>> => {
      const referencias = await conferirReferenciasDoFundo(this.contas, this.categorias, comando);
      if (referencias.tipo === 'erro') return referencias;
      const criado = Fundo.criar({ ...comando, id: gerarUuidV7() as FundoId });
      if (criado.tipo === 'erro') return criado;
      await this.fundos.adicionar(criado.valor);
      return ok(apresentarFundo(criado.valor));
    });
  }
}
