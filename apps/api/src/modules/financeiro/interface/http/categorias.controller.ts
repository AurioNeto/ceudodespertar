import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { CriarCategoria as ComandoCriarCategoria, EditarCategoria as ComandoEditarCategoria, ParametrosDoCadastro } from '@cdd/contracts';
import type { Categoria, CategoriaId, CategoriasDaCasa } from '@cdd/contracts';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConsultarCadastros } from '../../application/cadastros/consultar-cadastros.js';
import { CriarCategoria } from '../../application/cadastros/criar-categoria.js';
import { EditarCategoria } from '../../application/cadastros/editar-categoria.js';
import { informarLocalizacaoDoCriado } from './localizacao-do-criado.js';
import type { RespostaComCabecalhos } from './localizacao-do-criado.js';

const ROTA_DE_CATEGORIAS = '/api/v1/financeiro/categorias';

@Controller('financeiro/categorias')
export class CategoriasController {
  constructor(
    private readonly consultarCadastros: ConsultarCadastros,
    private readonly criarCategoria: CriarCategoria,
    private readonly editarCategoria: EditarCategoria,
  ) {}

  @Get()
  @RequerPermissao('financeiro.plano_contas.ler')
  @ModoDeTransacao('leitura')
  listar(): Promise<CategoriasDaCasa> {
    return this.consultarCadastros.categoriasDaCasa();
  }

  @Post()
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  async criar(
    @Body({ schema: ComandoCriarCategoria }) comando: ComandoCriarCategoria,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<Categoria, ErroDeDominio>> {
    const criada = await this.criarCategoria.executar(comando);
    return informarLocalizacaoDoCriado(resposta, ROTA_DE_CATEGORIAS, criada);
  }

  @Put(':id')
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  editar(
    @Param({ schema: ParametrosDoCadastro }) { id }: ParametrosDoCadastro,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoEditarCategoria }) comando: ComandoEditarCategoria,
  ): Promise<Result<Categoria, ErroDeDominio>> {
    return this.editarCategoria.executar({ ...comando, categoriaId: id as CategoriaId, versaoEsperada });
  }
}
