import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { CriarFundo as ComandoCriarFundo, EditarFundo as ComandoEditarFundo, ParametrosDoCadastro } from '@cdd/contracts';
import type { Fundo, FundoId, FundosDaCasa } from '@cdd/contracts';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConsultarCadastros } from '../../application/cadastros/consultar-cadastros.js';
import { CriarFundo } from '../../application/cadastros/criar-fundo.js';
import { EditarFundo } from '../../application/cadastros/editar-fundo.js';
import { informarLocalizacaoDoCriado } from './localizacao-do-criado.js';
import type { RespostaComCabecalhos } from './localizacao-do-criado.js';

const ROTA_DE_FUNDOS = '/api/v1/financeiro/fundos';

@Controller('financeiro/fundos')
export class FundosController {
  constructor(
    private readonly consultarCadastros: ConsultarCadastros,
    private readonly criarFundo: CriarFundo,
    private readonly editarFundo: EditarFundo,
  ) {}

  @Get()
  @RequerPermissao('financeiro.conta.ler')
  @ModoDeTransacao('leitura')
  listar(): Promise<FundosDaCasa> {
    return this.consultarCadastros.fundosDaCasa();
  }

  @Post()
  @RequerPermissao('financeiro.fundo.gerenciar')
  @ModoDeTransacao('escrita')
  async criar(
    @Body({ schema: ComandoCriarFundo }) comando: ComandoCriarFundo,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<Fundo, ErroDeDominio>> {
    const criada = await this.criarFundo.executar(comando);
    return informarLocalizacaoDoCriado(resposta, ROTA_DE_FUNDOS, criada);
  }

  @Put(':id')
  @RequerPermissao('financeiro.fundo.gerenciar')
  @ModoDeTransacao('escrita')
  editar(
    @Param({ schema: ParametrosDoCadastro }) { id }: ParametrosDoCadastro,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoEditarFundo }) comando: ComandoEditarFundo,
  ): Promise<Result<Fundo, ErroDeDominio>> {
    return this.editarFundo.executar({ ...comando, fundoId: id as FundoId, versaoEsperada });
  }
}
