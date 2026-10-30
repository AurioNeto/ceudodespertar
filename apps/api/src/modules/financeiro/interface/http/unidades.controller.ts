import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { CriarUnidade as ComandoCriarUnidade, EditarUnidade as ComandoEditarUnidade, ParametrosDoCadastro } from '@cdd/contracts';
import type { Unidade, UnidadeId, UnidadesDaCasa } from '@cdd/contracts';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConsultarCadastros } from '../../application/cadastros/consultar-cadastros.js';
import { CriarUnidade } from '../../application/cadastros/criar-unidade.js';
import { EditarUnidade } from '../../application/cadastros/editar-unidade.js';
import { informarLocalizacaoDoCriado } from './localizacao-do-criado.js';
import type { RespostaComCabecalhos } from './localizacao-do-criado.js';

const ROTA_DE_UNIDADES = '/api/v1/financeiro/unidades';

@Controller('financeiro/unidades')
export class UnidadesController {
  constructor(
    private readonly consultarCadastros: ConsultarCadastros,
    private readonly criarUnidade: CriarUnidade,
    private readonly editarUnidade: EditarUnidade,
  ) {}

  @Get()
  @RequerPermissao('financeiro.plano_contas.ler')
  @ModoDeTransacao('leitura')
  listar(): Promise<UnidadesDaCasa> {
    return this.consultarCadastros.unidadesDaCasa();
  }

  @Post()
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  async criar(
    @Body({ schema: ComandoCriarUnidade }) comando: ComandoCriarUnidade,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<Unidade, ErroDeDominio>> {
    const criada = await this.criarUnidade.executar(comando);
    return informarLocalizacaoDoCriado(resposta, ROTA_DE_UNIDADES, criada);
  }

  @Put(':id')
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  editar(
    @Param({ schema: ParametrosDoCadastro }) { id }: ParametrosDoCadastro,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoEditarUnidade }) comando: ComandoEditarUnidade,
  ): Promise<Result<Unidade, ErroDeDominio>> {
    return this.editarUnidade.executar({ ...comando, unidadeId: id as UnidadeId, versaoEsperada });
  }
}
