import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Res } from '@nestjs/common';
import {
  AlterarGruposDoUsuario,
  DesativarUsuario as ComandoDesativarUsuario,
  FiltroDeUsuarios,
  ParametrosDoUsuario,
  PedidoDeConvite,
  ReativarUsuario as ComandoReativarUsuario,
} from '@cdd/contracts';
import type {
  ConviteReenviado,
  GruposDoUsuarioDefinidos,
  PaginaDeUsuarios,
  SituacaoDoUsuarioAlterada,
  UsuarioConvidado,
} from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConvidarUsuario } from '../../application/usuarios/convidar-usuario.js';
import { DefinirGruposDoUsuario } from '../../application/usuarios/definir-grupos-do-usuario.js';
import { DesativarUsuario } from '../../application/usuarios/desativar-usuario.js';
import { ListarUsuarios } from '../../application/usuarios/listar-usuarios.js';
import { ReativarUsuario } from '../../application/usuarios/reativar-usuario.js';
import { ReenviarConvite } from '../../application/usuarios/reenviar-convite.js';

const ROTA_DE_USUARIOS = '/api/v1/identidade/usuarios';

interface RespostaComCabecalhos {
  setHeader(nome: string, valor: string): void;
}

@Controller('identidade/usuarios')
@RequerPermissao('sistema.usuario.gerenciar')
@ModoDeTransacao('escrita')
export class GestaoDeUsuariosController {
  constructor(
    private readonly desativarUsuario: DesativarUsuario,
    private readonly reativarUsuario: ReativarUsuario,
    private readonly definirGruposDoUsuario: DefinirGruposDoUsuario,
    private readonly convidarUsuario: ConvidarUsuario,
    private readonly reenviarConvite: ReenviarConvite,
    private readonly listarUsuarios: ListarUsuarios,
  ) {}

  @Get()
  @ModoDeTransacao('leitura')
  listar(@Query({ schema: FiltroDeUsuarios }) filtro: FiltroDeUsuarios): Promise<PaginaDeUsuarios> {
    return this.listarUsuarios.executar(filtro);
  }

  @Post()
  @RespostaSemCorpoNoReplay()
  async convidar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Body({ schema: PedidoDeConvite }) { nome, email, grupos }: PedidoDeConvite,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<UsuarioConvidado, ErroDeDominio>> {
    const convidado = await this.convidarUsuario.executar(acesso, { nome, email, grupos });
    if (convidado.tipo === 'ok') resposta.setHeader('Location', `${ROTA_DE_USUARIOS}/${convidado.valor.id}`);
    return convidado;
  }

  @Post(':id/convite/reenviar')
  @HttpCode(HttpStatus.OK)
  reenviar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDoUsuario }) { id }: ParametrosDoUsuario,
    @IfMatch() versaoEsperada: number,
  ): Promise<Result<ConviteReenviado, ErroDeDominio>> {
    return this.reenviarConvite.executar(acesso, { usuarioId: id, versaoEsperada });
  }

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
