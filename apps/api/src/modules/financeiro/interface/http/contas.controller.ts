import { Body, Controller, Get, Param, Post, Put, Res } from '@nestjs/common';
import { CriarConta as ComandoCriarConta, EditarConta as ComandoEditarConta, ParametrosDoCadastro } from '@cdd/contracts';
import type { Conta, ContaId, ContasDaCasa } from '@cdd/contracts';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { ConsultarCadastros } from '../../application/cadastros/consultar-cadastros.js';
import { CriarConta } from '../../application/cadastros/criar-conta.js';
import { EditarConta } from '../../application/cadastros/editar-conta.js';
import { informarLocalizacaoDoCriado } from './localizacao-do-criado.js';
import type { RespostaComCabecalhos } from './localizacao-do-criado.js';

const ROTA_DE_CONTAS = '/api/v1/financeiro/contas';

@Controller('financeiro/contas')
export class ContasController {
  constructor(
    private readonly consultarCadastros: ConsultarCadastros,
    private readonly criarConta: CriarConta,
    private readonly editarConta: EditarConta,
  ) {}

  @Get()
  @RequerPermissao('financeiro.conta.ler')
  @ModoDeTransacao('leitura')
  listar(): Promise<ContasDaCasa> {
    return this.consultarCadastros.contasDaCasa();
  }

  @Post()
  @RequerPermissao('financeiro.conta.gerenciar')
  @ModoDeTransacao('escrita')
  async criar(
    @Body({ schema: ComandoCriarConta }) comando: ComandoCriarConta,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<Conta, ErroDeDominio>> {
    const criada = await this.criarConta.executar(comando);
    return informarLocalizacaoDoCriado(resposta, ROTA_DE_CONTAS, criada);
  }

  @Put(':id')
  @RequerPermissao('financeiro.conta.gerenciar')
  @ModoDeTransacao('escrita')
  editar(
    @Param({ schema: ParametrosDoCadastro }) { id }: ParametrosDoCadastro,
    @IfMatch() versaoEsperada: number,
    @Body({ schema: ComandoEditarConta }) comando: ComandoEditarConta,
  ): Promise<Result<Conta, ErroDeDominio>> {
    return this.editarConta.executar({ ...comando, contaId: id as ContaId, versaoEsperada });
  }
}
