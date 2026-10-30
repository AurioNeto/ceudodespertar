import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import {
  CriarGrupoDeCusto as ComandoCriarGrupoDeCusto,
  EditarGrupoDeCusto as ComandoEditarGrupoDeCusto,
  ParametrosDoCadastro,
} from '@cdd/contracts';
import type { GrupoDeCusto, GrupoDeCustoId, GruposDeCustoDaCasa } from '@cdd/contracts';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConsultarCadastros } from '../../application/cadastros/consultar-cadastros.js';
import { CriarGrupoDeCusto } from '../../application/cadastros/criar-grupo-de-custo.js';
import { EditarGrupoDeCusto } from '../../application/cadastros/editar-grupo-de-custo.js';
import { informarLocalizacaoDoCriado } from './localizacao-do-criado.js';
import type { RespostaComCabecalhos } from './localizacao-do-criado.js';

const ROTA_DE_GRUPOS_DE_CUSTO = '/api/v1/financeiro/grupos-de-custo';

@Controller('financeiro/grupos-de-custo')
export class GruposDeCustoController {
  constructor(
    private readonly consultarCadastros: ConsultarCadastros,
    private readonly criarGrupoDeCusto: CriarGrupoDeCusto,
    private readonly editarGrupoDeCusto: EditarGrupoDeCusto,
  ) {}

  @Get()
  @RequerPermissao('financeiro.plano_contas.ler')
  @ModoDeTransacao('leitura')
  listar(): Promise<GruposDeCustoDaCasa> {
    return this.consultarCadastros.gruposDeCustoDaCasa();
  }

  @Post()
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  async criar(
    @Body({ schema: ComandoCriarGrupoDeCusto }) comando: ComandoCriarGrupoDeCusto,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<GrupoDeCusto, ErroDeDominio>> {
    const criado = await this.criarGrupoDeCusto.executar(comando);
    return informarLocalizacaoDoCriado(resposta, ROTA_DE_GRUPOS_DE_CUSTO, criado);
  }

  @Put(':id')
  @RequerPermissao('financeiro.plano_contas.gerenciar')
  @ModoDeTransacao('escrita')
  editar(
    @Param({ schema: ParametrosDoCadastro }) { id }: ParametrosDoCadastro,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoEditarGrupoDeCusto }) comando: ComandoEditarGrupoDeCusto,
  ): Promise<Result<GrupoDeCusto, ErroDeDominio>> {
    return this.editarGrupoDeCusto.executar({ ...comando, grupoDeCustoId: id as GrupoDeCustoId, versaoEsperada });
  }
}
