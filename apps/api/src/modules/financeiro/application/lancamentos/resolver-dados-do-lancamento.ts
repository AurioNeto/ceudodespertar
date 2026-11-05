import { Injectable } from '@nestjs/common';
import type { DadosDoLancamento, Etiqueta } from '@cdd/contracts';
import { EventosMinimos } from '../../../eventos/public-api.js';
import { ResumoDaPessoa } from '../../../pessoas/public-api.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { RepositorioDeGrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';

@Injectable()
export class ResolverDadosDoLancamento {
  constructor(
    private readonly unidades: RepositorioDeUnidade,
    private readonly categorias: RepositorioDeCategoria,
    private readonly contas: RepositorioDeConta,
    private readonly fundos: RepositorioDeFundo,
    private readonly grupos: RepositorioDeGrupoDeCusto,
    private readonly pessoas: ResumoDaPessoa,
    private readonly eventos: EventosMinimos,
  ) {}

  async executar(dados: DadosDoLancamento, confirmando = false): Promise<Result<readonly Etiqueta[], ErroDeDominio>> {
    if (dados.faturaId !== null) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (dados.eventoId !== null && await this.eventos.porId(dados.eventoId) === undefined) {
      return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    }
    const unidade = dados.unidadeId === null ? undefined : await this.unidades.porId(dados.unidadeId);
    if (dados.unidadeId !== null && unidade === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (unidade !== undefined && !unidade.ativa) return err(erroDeDominio('CADASTRO_INATIVO'));
    const conta = dados.contaId === null ? undefined : await this.contas.porId(dados.contaId);
    if (dados.contaId !== null && conta === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (conta !== undefined && !conta.ativa) return err(erroDeDominio('CADASTRO_INATIVO'));
    if (confirmando && dados.natureza === 'DESPESA' && conta?.titularidade === 'PESSOAL_DE_TERCEIRO') {
      return err(erroDeDominio('LANCAMENTO_INCOMPLETO', { dependencia: 'ADIANTAMENTO_B2' }));
    }
    if (dados.grupoDeCustoId !== null) {
      const grupo = await this.grupos.porId(dados.grupoDeCustoId);
      if (grupo === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      if (!grupo.ativo) return err(erroDeDominio('CADASTRO_INATIVO'));
    }
    const pessoas = [dados.pessoaId, dados.reembolsoAId].filter((id) => id !== null);
    const pessoasValidas = await Promise.all(pessoas.map(async (id) => this.pessoas.porId(id)));
    if (pessoasValidas.some((pessoa) => pessoa === undefined)) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (pessoasValidas.some((pessoa) => !pessoa!.ativa)) return err(erroDeDominio('CADASTRO_INATIVO'));
    const etiquetas = await Promise.all(dados.etiquetas.map(async (e): Promise<Result<Etiqueta, ErroDeDominio>> => {
      const categoria = await this.categorias.porId(e.categoriaId);
      if (categoria === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      if (!categoria.ativa) return err(erroDeDominio('CADASTRO_INATIVO'));
      if (unidade !== undefined) {
        const uso = categoria.conferirUsoNoRegime(unidade.regime);
        if (uso.tipo === 'erro') return uso;
      }
      return ok({ categoriaId: e.categoriaId, valor: e.valor, natureza: categoria.natureza });
    }));
    const resolvidas: Etiqueta[] = [];
    for (const etiqueta of etiquetas) {
      if (etiqueta.tipo === 'erro') return etiqueta;
      resolvidas.push(etiqueta.valor);
    }
    if (confirmando && dados.contaId !== null) {
      const fundos = (await this.fundos.listar()).filter((fundo) => fundo.contaVinculadaId === dados.contaId);
      const categorias = await this.categorias.listar();
      const recusas = fundos.flatMap((fundo) => resolvidas.filter((e) => e.natureza === 'DESPESA').map((e) => {
        const codigo = categorias.find((c) => c.id === e.categoriaId)!.codigoSistema;
        return fundo.conferirSaidaParaCategoria(codigo);
      }));
      const recusa = recusas.find((r) => r.tipo === 'erro');
      if (recusa?.tipo === 'erro') return recusa;
    }
    return ok(resolvidas);
  }
}
