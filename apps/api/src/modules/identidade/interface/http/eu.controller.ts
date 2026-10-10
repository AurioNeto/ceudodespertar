import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AtivarConvite as PedidoDeAtivacao } from '@cdd/contracts';
import type { Eu, UsuarioAtivado } from '@cdd/contracts';
import { ContextoAtual, IdentidadeAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import type { IdentidadeAutenticada } from '../../../../shared/infrastructure/autenticacao/identidade-autenticada.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { SemTransacaoNaBorda } from '../../../../shared/infrastructure/http/sem-transacao-na-borda.decorator.js';
import { SemIdempotencia } from '../../../../shared/infrastructure/idempotencia/sem-idempotencia.decorator.js';
import { ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import { ApenasIdentificado, ApenasUsuarioAtivo } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { AtivarConvite } from '../../application/convite/ativar-convite.js';
import { ObterEu } from '../../application/obter-eu.js';

@Controller('eu')
export class EuController {
  constructor(
    private readonly obterEu: ObterEu,
    private readonly ativarConvite: AtivarConvite,
  ) {}

  @ApenasUsuarioAtivo()
  @ModoDeTransacao('leitura-que-grava')
  @Get()
  obter(@ContextoAtual() acesso: ContextoDeAcesso): Promise<Eu> {
    return this.obterEu.executar(acesso);
  }

  @ApenasIdentificado()
  @SemTransacaoNaBorda()
  @SemIdempotencia()
  @HttpCode(HttpStatus.OK)
  @Post('ativacao')
  async ativar(
    @IdentidadeAtual() identidade: IdentidadeAutenticada,
    @Body({ schema: PedidoDeAtivacao }) { convite }: PedidoDeAtivacao,
  ): Promise<UsuarioAtivado> {
    const ativacao = await this.ativarConvite.executar({ token: convite, sujeito: identidade.sub });
    if (ativacao.tipo === 'erro') throw new ErroDeDominioException(ativacao.erro);
    return ativacao.valor;
  }
}
