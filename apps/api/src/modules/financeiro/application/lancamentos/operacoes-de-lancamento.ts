import { Injectable } from '@nestjs/common';
import type { ConfirmarLancamento, DadosDoLancamento, DataLocal, LancamentoId, RegistroDeLancamento } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { Lancamento, competenciaDe } from '../../domain/lancamento/lancamento.js';
import { RepositorioDeLancamento } from '../../domain/lancamento/lancamento.repo.js';
import { ResolverDadosDoLancamento } from './resolver-dados-do-lancamento.js';
import { SituacaoDoPeriodo } from './situacao-do-periodo.js';

@Injectable()
export class OperacoesDeLancamento {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly repo: RepositorioDeLancamento,
    private readonly referencias: ResolverDadosDoLancamento, private readonly periodos: SituacaoDoPeriodo, private readonly relogio: Relogio) {}

  registrar(acesso: ContextoDeAcesso, dados: DadosDoLancamento): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const etiquetas = await this.referencias.executar(dados);
      if (etiquetas.tipo === 'erro') return etiquetas;
      const criado = Lancamento.registrar(gerarUuidV7() as LancamentoId, dados, etiquetas.valor, acesso.usuarioId, this.relogio.agora(), await this.aberto(dados));
      if (criado.tipo === 'erro') return criado;
      await this.repo.adicionar(criado.valor);
      return ok(await this.apresentar(criado.valor));
    });
  }

  async obter(acesso: ContextoDeAcesso, id: LancamentoId): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    const l = await this.repo.porId(id);
    if (l === undefined || (!acesso.permissoes.has('financeiro.lancamento.ler') && l.estado.registradoPor !== acesso.usuarioId)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    return ok(await this.apresentar(l));
  }

  editar(acesso: ContextoDeAcesso, id: LancamentoId, versao: number, dados: DadosDoLancamento): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao, acesso);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const etiquetas = await this.referencias.executar(dados);
      if (etiquetas.tipo === 'erro') return etiquetas;
      const alterado = l.editar(dados, etiquetas.valor, acesso.usuarioId, this.relogio.agora(), await this.aberto(l.estado, dados));
      if (alterado.tipo === 'erro') return alterado;
      return ok(await this.apresentar(l, await this.repo.salvar(l)));
    });
  }

  confirmar(acesso: ContextoDeAcesso, id: LancamentoId, versao: number, comando: ConfirmarLancamento): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const dados = { ...l.estado, etiquetas: [...(comando.etiquetas ?? l.estado.etiquetas)] };
      const etiquetas = await this.referencias.executar(dados, true);
      if (etiquetas.tipo === 'erro') return etiquetas;
      const aberto = await this.aberto(l.estado);
      if (comando.etiquetas !== undefined) {
        const editado = l.editar(dados, etiquetas.valor, acesso.usuarioId, this.relogio.agora(), aberto);
        if (editado.tipo === 'erro') return editado;
      }
      const confirmado = l.confirmar({ autorTipo: 'USUARIO', autorId: acesso.usuarioId }, this.relogio.agora(), aberto);
      if (confirmado.tipo === 'erro') return confirmado;
      return ok(await this.apresentar(l, await this.repo.salvar(l)));
    });
  }

  descartar(acesso: ContextoDeAcesso, id: LancamentoId, versao: number): Promise<Result<{ descartado: true }, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao, acesso);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const descartado = l.descartar(acesso.usuarioId, this.relogio.agora(), await this.aberto(l.estado));
      if (descartado.tipo === 'erro') return descartado;
      await this.repo.excluir(l);
      return ok({ descartado: true });
    });
  }

  estornar(acesso: ContextoDeAcesso, id: LancamentoId, versao: number, motivo: string): Promise<Result<RegistroDeLancamento, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const anterior = await this.repo.estornoDe(id);
      if (anterior !== undefined) return err(erroDeDominio('LANCAMENTO_JA_ESTORNADO', { estornoId: anterior }));
      const em = this.relogio.agora();
      const data = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(em) as DataLocal;
      const criado = l.estornar(gerarUuidV7() as LancamentoId, motivo, acesso.usuarioId, em, data, await this.aberto({ ...l.estado, dataCompetencia: data }), false);
      if (criado.tipo === 'erro') return criado;
      await this.repo.adicionar(criado.valor);
      return ok(await this.apresentar(criado.valor));
    });
  }

  async carregar(id: LancamentoId, versao: number, acesso?: ContextoDeAcesso): Promise<Result<Lancamento, ErroDeDominio>> {
    const l = await this.repo.porId(id);
    if (l === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (acesso !== undefined && !this.podeEditar(acesso, l)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (l.versao !== versao) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
    return ok(l);
  }

  async aberto(...dados: Pick<DadosDoLancamento, 'unidadeId' | 'dataCompetencia'>[]): Promise<boolean> {
    const periodos = dados.flatMap(d => d.unidadeId === null || d.dataCompetencia === null ? [] : [{ unidadeId: d.unidadeId, competencia: competenciaDe(d.dataCompetencia)! }]);
    await this.periodos.proteger(periodos);
    const abertos = await Promise.all(periodos.map(p => this.periodos.estaAberto(p.unidadeId, p.competencia)));
    return abertos.every(Boolean);
  }

  async apresentar(l: Lancamento, versao = l.versao): Promise<RegistroDeLancamento> {
    return { ...l.estado, versao, estornadoPorId: await this.repo.estornoDe(l.id) ?? null, pendencias: l.pendencias };
  }

  private podeEditar(acesso: ContextoDeAcesso, l: Lancamento): boolean {
    return acesso.permissoes.has('financeiro.lancamento.confirmar') || l.estado.registradoPor === acesso.usuarioId;
  }
}
