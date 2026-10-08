import { Controller, Get } from '@nestjs/common';
import type { Eu } from '@cdd/contracts';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ApenasUsuarioAtivo } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ObterEu } from '../../application/obter-eu.js';

@Controller('eu')
export class EuController {
  constructor(private readonly obterEu: ObterEu) {}

  @ApenasUsuarioAtivo()
  @Get()
  obter(@ContextoAtual() acesso: ContextoDeAcesso): Promise<Eu> {
    return this.obterEu.executar(acesso);
  }
}
