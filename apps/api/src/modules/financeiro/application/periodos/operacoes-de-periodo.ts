import { Injectable } from '@nestjs/common';
import type { IntegridadeDoPeriodo, PeriodoContabil as Registro, PeriodoContabilId } from '@cdd/contracts';
import type { ContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { PeriodoContabil } from '../../domain/periodo/periodo-contabil.js';
import { RepositorioDePeriodo, type ChaveDoPeriodo } from '../../domain/periodo/periodo-contabil.repo.js';
import { hashDoPeriodo } from '../../domain/periodo/hash-do-periodo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';

@Injectable()
export class OperacoesDePeriodo {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly repo: RepositorioDePeriodo,
    private readonly unidades: RepositorioDeUnidade, private readonly relogio: Relogio) {}

  async obter(chave: ChaveDoPeriodo): Promise<Result<Registro, ErroDeDominio>> {
    const p = await this.repo.porChave(chave);
    return p === undefined ? err(erroDeDominio('RECURSO_NAO_ENCONTRADO')) : ok(p.estado);
  }
  async verificar(chave: ChaveDoPeriodo): Promise<Result<IntegridadeDoPeriodo, ErroDeDominio>> {
    const p = await this.repo.porChave(chave);
    if (p === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    const { movimentos } = await this.repo.movimentos(chave);
    const hashAtual = hashDoPeriodo(chave.unidadeId, chave.competencia, movimentos);
    return ok({ hashGravado: p.estado.hash, hashAtual, integro: p.estado.hash === null ? null : p.estado.hash === hashAtual });
  }
  fechar(acesso: ContextoDeAcesso, chave: ChaveDoPeriodo, versao: number): Promise<Result<Registro, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      if (await this.unidades.porId(chave.unidadeId) === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      await this.repo.travar(chave, true);
      const anterior = await this.repo.porChave(chave);
      if ((anterior?.versao ?? 0) !== versao) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
      const p = anterior ?? PeriodoContabil.abrir(gerarUuidV7() as PeriodoContabilId, chave.unidadeId, chave.competencia);
      const { movimentos, pendentes } = await this.repo.movimentos(chave);
      const resultado = p.fechar(pendentes, await this.repo.anteriorFechado(chave), hashDoPeriodo(chave.unidadeId, chave.competencia, movimentos), acesso.usuarioId, this.relogio.agora());
      if (resultado.tipo === 'erro') return resultado;
      if (anterior === undefined) { await this.repo.adicionar(p); return ok(p.estado); }
      return ok({ ...p.estado, versao: await this.repo.salvar(p) });
    });
  }
  reabrir(acesso: ContextoDeAcesso, chave: ChaveDoPeriodo, versao: number, motivo: string): Promise<Result<Registro, ErroDeDominio>> {
    return this.unidade.transacao('escrita', async () => {
      await this.repo.travar(chave, false);
      const p = await this.repo.porChave(chave);
      if (p === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      if (p.versao !== versao) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
      const resultado = p.reabrir(motivo, acesso.usuarioId, this.relogio.agora());
      if (resultado.tipo === 'erro') return resultado;
      return ok({ ...p.estado, versao: await this.repo.salvar(p) });
    });
  }
}
