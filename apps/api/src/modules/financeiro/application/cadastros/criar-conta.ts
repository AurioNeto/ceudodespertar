import { Injectable } from '@nestjs/common';
import type { Conta as ContaDoContrato, ContaId, CriarConta as ComandoCriarConta } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { ResumoDaPessoa } from '../../../pessoas/public-api.js';
import { Conta } from '../../domain/conta/conta.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { apresentarConta } from './apresentacao-dos-cadastros.js';
import { conferirReferenciasDaConta } from './conferir-referencias-da-conta.js';

@Injectable()
export class CriarConta {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly contas: RepositorioDeConta,
    private readonly unidades: RepositorioDeUnidade,
    private readonly pessoas: ResumoDaPessoa,
  ) {}

  executar(comando: ComandoCriarConta): Promise<Result<ContaDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<ContaDoContrato, ErroDeDominio>> => {
      const referencias = await conferirReferenciasDaConta(this.unidades, comando.unidadeId);
      if (referencias.tipo === 'erro') return referencias;
      if (comando.pessoaTitularId !== null) {
        const titular = await this.pessoas.porId(comando.pessoaTitularId);
        if (titular === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
        if (!titular.ativa) return err(erroDeDominio('CADASTRO_INATIVO'));
      }
      const criado = Conta.criar({ ...comando, id: gerarUuidV7() as ContaId });
      if (criado.tipo === 'erro') return criado;
      await this.contas.adicionar(criado.valor);
      return ok(apresentarConta(criado.valor));
    });
  }
}
