import { Controller, Get, Query } from '@nestjs/common';
import { FiltroDeAuditoria } from '@cdd/contracts';
import type { PaginaDeAuditoria } from '@cdd/contracts';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { ConsultarAuditoria } from '../../application/auditoria/consultar-auditoria.js';

@Controller('identidade/auditoria')
export class AuditoriaController {
  constructor(private readonly consultarAuditoria: ConsultarAuditoria) {}

  @RequerPermissao('sistema.auditoria.ler')
  @ModoDeTransacao('leitura-que-grava')
  @Get()
  consultar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Query({ schema: FiltroDeAuditoria }) filtro: FiltroDeAuditoria,
  ): Promise<PaginaDeAuditoria> {
    return this.consultarAuditoria.executar(acesso, filtro);
  }
}
