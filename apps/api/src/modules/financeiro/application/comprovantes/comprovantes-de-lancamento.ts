import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Anexo, AnexoId, LancamentoId, RegistroDeLancamento } from '@cdd/contracts';
import { ArmazenamentoDeArquivos } from '../../../../shared/infrastructure/arquivos/armazenamento-de-arquivos.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeLancamento } from '../../domain/lancamento/lancamento.repo.js';
import { OperacoesDeLancamento } from '../lancamentos/operacoes-de-lancamento.js';
import { validarArquivo, type ArquivoRecebido } from './arquivo-de-comprovante.js';
import { RepositorioDeComprovantes } from './repositorio-de-comprovantes.js';

@Injectable()
export class ComprovantesDeLancamento {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly lancamentos: RepositorioDeLancamento,
    private readonly operacoes: OperacoesDeLancamento, private readonly comprovantes: RepositorioDeComprovantes,
    private readonly storage: ArmazenamentoDeArquivos, private readonly relogio: Relogio) {}

  anexar(acesso: ContextoDeAcesso, id: LancamentoId, versao: number, arquivo: ArquivoRecebido | undefined): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.operacoes.carregar(id, versao, acesso);
      if (lido.tipo === 'erro') return lido;
      const validado = validarArquivo(arquivo);
      if (validado.tipo === 'erro') return validado;
      const { nome, mime, conteudo } = validado.valor;
      const l = lido.valor;
      const comprovanteId = gerarUuidV7() as AnexoId;
      const estado = l.estado;
      const alterado = l.editar({ ...estado, etiquetas: [...estado.etiquetas], comprovanteId }, estado.etiquetas,
        acesso.usuarioId, this.relogio.agora(), await this.operacoes.aberto(estado));
      if (alterado.tipo === 'erro') return alterado;
      const chave = `${acesso.instituicaoId}/financeiro/${comprovanteId}`;
      const novaVersao = await this.lancamentos.salvar(l);
      await this.comprovantes.adicionar({ id: comprovanteId, chave, nome, mime,
        tamanhoBytes: conteudo.length, sha256: createHash('sha256').update(conteudo).digest('hex') }, acesso.usuarioId);
      await this.storage.gravar(chave, conteudo, mime);
      return ok(await this.operacoes.apresentar(l, novaVersao));
    });
  }

  async obter(acesso: ContextoDeAcesso, id: LancamentoId): Promise<Result<Anexo, ErroDeDominio>> {
    const lido = await this.operacoes.obter(acesso, id);
    if (lido.tipo === 'erro') return lido;
    const comprovanteId = lido.valor.comprovanteId;
    const anexo = comprovanteId === null ? undefined : await this.comprovantes.porId(comprovanteId);
    if (!anexo) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    return ok({ id: anexo.id, nome: anexo.nome, tipo: anexo.mime, tamanhoBytes: anexo.tamanhoBytes,
      url: await this.storage.urlDeLeitura(anexo.chave) });
  }
}
