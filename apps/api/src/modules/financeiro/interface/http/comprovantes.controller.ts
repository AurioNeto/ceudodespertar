import { Controller, Get, Header, Param, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParametrosDoLancamento } from '@cdd/contracts';
import { RequerAlgumaPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { ComprovantesDeLancamento } from '../../application/comprovantes/comprovantes-de-lancamento.js';
import { LIMITE_DO_COMPROVANTE, type ArquivoRecebido } from '../../application/comprovantes/arquivo-de-comprovante.js';

@Controller('financeiro/lancamentos/:id/comprovante')
export class ComprovantesController {
  constructor(private readonly comprovantes: ComprovantesDeLancamento) {}

  @Put()
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar')
  @ModoDeTransacao('escrita')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: LIMITE_DO_COMPROVANTE + 1, files: 1, fields: 0 } }))
  anexar(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento,
    @IfMatch() versao: number, @UploadedFile() arquivo: ArquivoRecebido | undefined) {
    return this.comprovantes.anexar(acesso, id, versao, arquivo);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @RequerAlgumaPermissao('financeiro.lancamento.ler', 'financeiro.lancamento.ler_proprios')
  @ModoDeTransacao('leitura')
  obter(@ContextoAtual() acesso: ContextoDeAcesso, @Param({ schema: ParametrosDoLancamento }) { id }: ParametrosDoLancamento) {
    return this.comprovantes.obter(acesso, id);
  }
}
