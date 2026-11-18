import { Body, Controller, Get, Header, Param, Post, Put, Query, Res } from '@nestjs/common';
import { CadastrarPessoa as Cadastro, EditarPessoa as Edicao, FiltroDePessoas, ParametrosDaPessoa } from '@cdd/contracts';
import type { Pessoa, PaginaDePessoas } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ContextoAtual } from '../../../../shared/infrastructure/autenticacao/requisicao-autenticada.js';
import { RequerPermissao } from '../../../../shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { IfMatch } from '../../../../shared/infrastructure/http/if-match.decorator.js';
import { ModoDeTransacao } from '../../../../shared/infrastructure/http/modo-de-transacao.decorator.js';
import { RespostaSemCorpoNoReplay } from '../../../../shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { CadastrarPessoa } from '../../application/cadastrar-pessoa.js';
import { EditarPessoa } from '../../application/editar-pessoa.js';
import { ListarPessoas } from '../../application/listar-pessoas.js';
import { ObterPessoa } from '../../application/obter-pessoa.js';

interface RespostaComCabecalhos { setHeader(nome: string, valor: string): void; }

@Controller('pessoas')
export class PessoasController {
  constructor(
    private readonly cadastrar: CadastrarPessoa,
    private readonly editar: EditarPessoa,
    private readonly listar: ListarPessoas,
    private readonly obter: ObterPessoa,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('pessoas.pessoa.ler')
  @ModoDeTransacao('leitura')
  listarPessoas(@Query({ schema: FiltroDePessoas }) filtro: FiltroDePessoas): Promise<PaginaDePessoas> {
    return this.listar.executar(filtro);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('pessoas.pessoa.ler')
  @ModoDeTransacao('leitura')
  obterPessoa(@Param({ schema: ParametrosDaPessoa }) { id }: ParametrosDaPessoa): Promise<Result<Pessoa, ErroDeDominio>> {
    return this.obter.executar(id);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('pessoas.pessoa.registrar')
  @ModoDeTransacao('escrita')
  @RespostaSemCorpoNoReplay()
  async cadastrarPessoa(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Body({ schema: Cadastro }) comando: Cadastro,
    @Res({ passthrough: true }) resposta: RespostaComCabecalhos,
  ): Promise<Result<Pessoa, ErroDeDominio>> {
    const criada = await this.cadastrar.executar(acesso.usuarioId, comando);
    if (criada.tipo === 'ok') resposta.setHeader('Location', `/api/v1/pessoas/${criada.valor.id}`);
    return criada;
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  @RequerPermissao('pessoas.pessoa.editar')
  @ModoDeTransacao('escrita')
  @RespostaSemCorpoNoReplay()
  editarPessoa(
    @ContextoAtual() acesso: ContextoDeAcesso,
    @Param({ schema: ParametrosDaPessoa }) { id }: ParametrosDaPessoa,
    @IfMatch() versao: number,
    @Body({ schema: Edicao }) comando: Edicao,
  ): Promise<Result<Pessoa, ErroDeDominio>> {
    return this.editar.executar(acesso.usuarioId, comando, id, versao);
  }
}
