import { Injectable } from '@nestjs/common';
import type { Conta as ContaDoContrato, ContaId, EditarConta as ComandoEditarConta } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { conferirVersao } from '../conferir-versao.js';
import { apresentarConta } from './apresentacao-dos-cadastros.js';
import { conferirReferenciasDaConta } from './conferir-referencias-da-conta.js';

export interface ComandoDeEdicaoDaConta extends ComandoEditarConta {
  readonly contaId: ContaId;
  readonly versaoEsperada: number;
}

@Injectable()
export class EditarConta {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly contas: RepositorioDeConta,
    private readonly unidades: RepositorioDeUnidade,
  ) {}

  executar(comando: ComandoDeEdicaoDaConta): Promise<Result<ContaDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<ContaDoContrato, ErroDeDominio>> => {
      const encontrada = conferirVersao(await this.contas.porId(comando.contaId), comando.versaoEsperada);
      if (encontrada.tipo === 'erro') return encontrada;
      const conta = encontrada.valor;
      const referencias = await conferirReferenciasDaConta(this.unidades, comando.unidadeId, {
        exigirAtiva: comando.unidadeId !== conta.unidadeId,
      });
      if (referencias.tipo === 'erro') return referencias;
      conta.alterar(comando);
      return ok(apresentarConta(conta, await this.contas.salvar(conta)));
    });
  }
}
