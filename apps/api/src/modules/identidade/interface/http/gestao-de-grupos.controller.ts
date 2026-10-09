import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Put } from '@nestjs/common';
import {
  ParametrosDaPermissaoDoGrupo,
  ParametrosDoGrupo,
  RenomearGrupo as ComandoRenomearGrupo,
} from '@cdd/contracts';
import type { DadosDoGrupoRenomeado, GruposDaGestao, PermissoesDoGrupoAlteradas } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { RequerAlgumaPermissao, RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConcederPermissaoAoGrupo } from '../../application/grupos/conceder-permissao-ao-grupo.js';
import { LeitorDeGrupos } from '../../application/grupos/leitor-de-grupos.js';
import { RenomearGrupo } from '../../application/grupos/renomear-grupo.js';
import { RevogarPermissaoDoGrupo } from '../../application/grupos/revogar-permissao-do-grupo.js';

@Controller('identidade/grupos')
export class GestaoDeGruposController {
  constructor(
    private readonly leitorDeGrupos: LeitorDeGrupos,
    private readonly concederPermissao: ConcederPermissaoAoGrupo,
    private readonly revogarPermissao: RevogarPermissaoDoGrupo,
    private readonly renomearGrupo: RenomearGrupo,
  ) {}

  @Get()
  @RequerAlgumaPermissao('sistema.usuario.gerenciar', 'sistema.grupo.gerenciar')
  @ModoDeTransacao('leitura')
  async listar(): Promise<GruposDaGestao> {
    return { itens: await this.leitorDeGrupos.listar() };
  }

  @Put(':id/permissoes/:codigo')
  @RequerPermissao('sistema.grupo.gerenciar')
  @ModoDeTransacao('escrita')
  conceder(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDaPermissaoDoGrupo }) { id, codigo }: ParametrosDaPermissaoDoGrupo,
    @IfMatch() versaoEsperada: number,
  ): Promise<Result<PermissoesDoGrupoAlteradas, ErroDeDominio>> {
    return this.concederPermissao.executar(acesso, { grupoId: id, versaoEsperada, permissao: codigo });
  }

  @Delete(':id/permissoes/:codigo')
  @RequerPermissao('sistema.grupo.gerenciar')
  @ModoDeTransacao('escrita')
  revogar(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDaPermissaoDoGrupo }) { id, codigo }: ParametrosDaPermissaoDoGrupo,
    @IfMatch() versaoEsperada: number,
  ): Promise<Result<PermissoesDoGrupoAlteradas, ErroDeDominio>> {
    return this.revogarPermissao.executar(acesso, { grupoId: id, versaoEsperada, permissao: codigo });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequerPermissao('sistema.grupo.gerenciar')
  @ModoDeTransacao('escrita')
  renomear(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDoGrupo }) { id }: ParametrosDoGrupo,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoRenomearGrupo }) { nome, descricao }: ComandoRenomearGrupo,
  ): Promise<Result<DadosDoGrupoRenomeado, ErroDeDominio>> {
    return this.renomearGrupo.executar(acesso, { grupoId: id, versaoEsperada, nome, descricao });
  }
}
