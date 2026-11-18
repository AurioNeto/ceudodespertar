import { Injectable } from '@nestjs/common';
import type { RegistrarTransferencia, Competencia, DataLocal, TransferenciaId, Transferencia as RegistroDeTransferencia } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { Transferencia } from '../../domain/transferencia/transferencia.js';
import { RepositorioDeTransferencia } from '../../domain/transferencia/transferencia.repo.js';
import { ResolverDadosDaTransferencia } from './resolver-dados-da-transferencia.js';
import { SituacaoDoPeriodo } from '../lancamentos/situacao-do-periodo.js';

@Injectable()
export class OperacoesDeTransferencia {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly repo: RepositorioDeTransferencia,
    private readonly referencias: ResolverDadosDaTransferencia, private readonly periodos: SituacaoDoPeriodo, private readonly relogio: Relogio) {}

  registrar(acesso: ContextoDeAcesso, dados: RegistrarTransferencia): Promise<Result<RegistroDeTransferencia, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const referencias = await this.referencias.executar(dados);
      if (referencias.tipo === 'erro') return referencias;
      const criado = Transferencia.registrar(gerarUuidV7() as TransferenciaId, dados, acesso.usuarioId, this.relogio.agora(), await this.aberto(dados));
      if (criado.tipo === 'erro') return criado;
      await this.repo.adicionar(criado.valor);
      return ok(await this.apresentar(criado.valor));
    });
  }

  async obter(acesso: ContextoDeAcesso, id: TransferenciaId): Promise<Result<RegistroDeTransferencia, ErroDeDominio>> {
    const l = await this.repo.porId(id);
    if (l === undefined || (!acesso.permissoes.has('financeiro.conta.ler') && l.estado.registradoPor !== acesso.usuarioId)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    return ok(await this.apresentar(l));
  }

  editar(acesso: ContextoDeAcesso, id: TransferenciaId, versao: number, dados: RegistrarTransferencia): Promise<Result<RegistroDeTransferencia, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao, acesso);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const referencias = await this.referencias.executar(dados);
      if (referencias.tipo === 'erro') return referencias;
      const alterado = l.editar(dados, acesso.usuarioId, this.relogio.agora(), await this.aberto(l.estado, dados));
      if (alterado.tipo === 'erro') return alterado;
      return ok(await this.apresentar(l, await this.repo.salvar(l)));
    });
  }

  confirmar(acesso: ContextoDeAcesso, id: TransferenciaId, versao: number): Promise<Result<RegistroDeTransferencia, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const referencias = await this.referencias.executar(l.estado);
      if (referencias.tipo === 'erro') return referencias;
      if (l.estado.estornoDeId !== null) {
        const original = await this.repo.porId(l.estado.estornoDeId);
        if (original === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
        if (original.estado.status !== 'CONFIRMADO') return err(erroDeDominio('TRANSFERENCIA_NAO_CONFIRMADA'));
        const outro = await this.repo.estornoDe(original.id);
        if (outro !== undefined && outro.id !== id && outro.status === 'CONFIRMADO') return err(erroDeDominio('TRANSFERENCIA_JA_ESTORNADA', { estornoId: outro.id }));
      }
      const confirmado = l.confirmar(acesso.usuarioId, this.relogio.agora(), await this.aberto(l.estado));
      if (confirmado.tipo === 'erro') return confirmado;
      return ok(await this.apresentar(l, await this.repo.salvar(l)));
    });
  }

  descartar(acesso: ContextoDeAcesso, id: TransferenciaId, versao: number): Promise<Result<{ descartado: true }, ErroDeDominio>> {
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

  estornar(acesso: ContextoDeAcesso, id: TransferenciaId, versao: number, motivo: string): Promise<Result<RegistroDeTransferencia, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      const lido = await this.carregar(id, versao);
      if (lido.tipo === 'erro') return lido;
      const l = lido.valor;
      const anterior = await this.repo.estornoDe(id);
      if (anterior !== undefined) return err(erroDeDominio('TRANSFERENCIA_JA_ESTORNADA', { estornoId: anterior.id }));
      const em = this.relogio.agora();
      const data = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(em) as DataLocal;
      const criado = l.estornar(gerarUuidV7() as TransferenciaId, motivo, acesso.usuarioId, em, data, await this.aberto({ ...l.estado, data: data }));
      if (criado.tipo === 'erro') return criado;
      const referencias = await this.referencias.executar(criado.valor.estado);
      if (referencias.tipo === 'erro') return referencias;
      await this.repo.adicionar(criado.valor);
      return ok(await this.apresentar(criado.valor));
    });
  }

  async carregar(id: TransferenciaId, versao: number, acesso?: ContextoDeAcesso): Promise<Result<Transferencia, ErroDeDominio>> {
    const l = await this.repo.porId(id);
    if (l === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (acesso !== undefined && !this.podeEditar(acesso, l)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (l.versao !== versao) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
    return ok(l);
  }

  async aberto(...dados: Pick<RegistrarTransferencia, 'unidadeId' | 'unidadeDestinoId' | 'data'>[]): Promise<boolean> {
    const periodos = dados.flatMap(d => [d.unidadeId, d.unidadeDestinoId].filter(id => id !== null).map(unidadeId => ({ unidadeId, competencia: d.data.slice(0, 7) as Competencia })));
    await this.periodos.proteger(periodos);
    const abertos = await Promise.all(periodos.map(p => this.periodos.estaAberto(p.unidadeId, p.competencia)));
    return abertos.every(Boolean);
  }

  async apresentar(l: Transferencia, versao = l.versao): Promise<RegistroDeTransferencia> {
    const estorno = await this.repo.estornoDe(l.id);
    return { ...l.estado, versao, estornadaPorId: estorno?.status === 'CONFIRMADO' ? estorno.id : null };
  }

  private podeEditar(acesso: ContextoDeAcesso, l: Transferencia): boolean {
    return acesso.permissoes.has('financeiro.lancamento.confirmar') || l.estado.registradoPor === acesso.usuarioId;
  }
}
