import { Body, Controller, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import {
  AlterarGruposDoUsuario,
  DesativarUsuario as ComandoDesativarUsuario,
  ParametrosDoUsuario,
  ReativarUsuario as ComandoReativarUsuario,
} from '@cdd/contracts';
import type { GruposDoUsuarioDefinidos, SituacaoDoUsuarioAlterada } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { DefinirGruposDoUsuario } from '../../application/usuarios/definir-grupos-do-usuario.js';
import { DesativarUsuario } from '../../application/usuarios/desativar-usuario.js';
import { ReativarUsuario } from '../../application/usuarios/reativar-usuario.js';

@Controller('identidade/usuarios')
@RequerPermissao('sistema.usuario.gerenciar')
@ModoDeTransacao('escrita')
export class GestaoDeUsuariosController {
  constructor(
    private readonly desativarUsuario: DesativarUsuario,
    private readonly reativarUsuario: ReativarUsuario,
    private readonly definirGruposDoUsuario: DefinirGruposDoUsuario,
  ) {}

  @Post(':id/desativar')
  @HttpCode(HttpStatus.OK)
  desativar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDoUsuario }) { id }: ParametrosDoUsuario,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoDesativarUsuario }) { motivo }: ComandoDesativarUsuario,
  ): Promise<Result<SituacaoDoUsuarioAlterada, ErroDeDominio>> {
    return this.desativarUsuario.executar(acesso, { usuarioId: id, versaoEsperada, motivo });
  }

  @Post(':id/reativar')
  @HttpCode(HttpStatus.OK)
  reativar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDoUsuario }) { id }: ParametrosDoUsuario,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoReativarUsuario }) { motivo }: ComandoReativarUsuario,
  ): Promise<Result<SituacaoDoUsuarioAlterada, ErroDeDominio>> {
    return this.reativarUsuario.executar(acesso, { usuarioId: id, versaoEsperada, motivo });
  }

  @Put(':id/grupos')
  definirGrupos(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDoUsuario }) { id }: ParametrosDoUsuario,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: AlterarGruposDoUsuario }) { grupos }: AlterarGruposDoUsuario,
  ): Promise<Result<GruposDoUsuarioDefinidos, ErroDeDominio>> {
    return this.definirGruposDoUsuario.executar(acesso, { usuarioId: id, versaoEsperada, grupos });
  }
}
