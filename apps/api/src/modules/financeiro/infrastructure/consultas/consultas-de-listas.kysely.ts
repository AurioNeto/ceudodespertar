import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type {
  FaltaParaConferir, FiltroDeListaFinanceira, FiltroDeListaPorCompetencia, MovimentoNaConsulta,
  PaginaFinanceira, RegistroProprioNaConsulta, UsuarioId,
} from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ListasFinanceiras } from '../../application/consultas/consultas-financeiras.js';

const statusDoLancamento = sql`case when l.status = 'CONFIRMADO' and exists (
  select 1 from financeiro.lancamento estorno
  where estorno.estorno_de_id = l.id and estorno.instituicao_id = l.instituicao_id
    and estorno.status = 'CONFIRMADO'
) then 'ESTORNADO' else l.status end`;

const pendenciaAberta = sql`(
  select jsonb_build_object('id', p.id, 'texto', p.texto)
  from financeiro.pendencia p
  where p.lancamento_id = l.id and p.instituicao_id = l.instituicao_id and p.resolvida_em is null
  order by p.aberta_em desc, p.id desc limit 1
)`;

function pagina<T>(rows: T[], filtro: FiltroDeListaFinanceira): PaginaFinanceira<T> {
  return {
    itens: rows.slice(0, filtro.limite),
    proximaPagina: rows.length > filtro.limite ? filtro.pagina + 1 : null,
  };
}

function deslocamento(filtro: FiltroDeListaFinanceira): number {
  return (filtro.pagina - 1) * filtro.limite;
}

type MovimentoComEtiquetas = MovimentoNaConsulta & { readonly etiquetasFecham: boolean };

function faltasDoMovimento(m: MovimentoComEtiquetas): FaltaParaConferir[] {
  const faltas: FaltaParaConferir[] = [];
  if (m.unidadeId === null) faltas.push('UNIDADE');
  if (m.conta === null || (m.tipo === 'TRANSFERENCIA' && m.contaDestino === null)) faltas.push('CONTA');
  if (m.competencia === null) faltas.push('COMPETENCIA');
  if (m.tipo !== 'TRANSFERENCIA') {
    if (m.categorias.length === 0) faltas.push('CATEGORIA');
    else if (!m.etiquetasFecham) faltas.push('ETIQUETAS_NAO_FECHAM');
  }
  if (m.pendencia !== null) faltas.push('PENDENCIA');
  return faltas;
}

@Injectable()
export class ListasFinanceirasKysely extends ListasFinanceiras {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  meusRegistros(filtro: FiltroDeListaFinanceira, autor: UsuarioId) {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const unidade = filtro.unidadeId ?? null;
      const { rows } = await sql<RegistroProprioNaConsulta>`
        select l.id, case when l.natureza = 'RECEITA' then 'ENTRADA' else 'SAIDA' end as tipo,
          l.valor, l.motivo, to_char(l.registrado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "registradoEm",
          l.data_competencia as "dataCompetencia", ${statusDoLancamento} as status,
          l.versao, ${pendenciaAberta} as pendencia, l.comprovante_id as "comprovanteId"
        from financeiro.lancamento l
        where l.registrado_por = ${autor} and (${unidade}::uuid is null or l.unidade_id = ${unidade})
        order by l.registrado_em desc, l.id desc
        limit ${filtro.limite + 1} offset ${deslocamento(filtro)}
      `.execute(kysely);
      return pagina(rows, filtro);
    });
  }

  async fila(filtro: FiltroDeListaFinanceira) {
    const rows = await this.movimentos(filtro, true);
    return pagina(rows.map(m => {
      const { etiquetasFecham: _etiquetasFecham, ...movimento } = m;
      return Object.assign(movimento, { faltas: faltasDoMovimento(m) });
    }), filtro);
  }

  async livro(filtro: FiltroDeListaPorCompetencia) {
    const rows = await this.movimentos(filtro, false);
    return pagina(rows.map(({ etiquetasFecham: _etiquetasFecham, ...movimento }) => movimento), filtro);
  }

  private movimentos(filtro: FiltroDeListaPorCompetencia, fila: boolean): Promise<MovimentoComEtiquetas[]> {
    const unidade = filtro.unidadeId ?? null;
    const competencia = filtro.competencia ? `${filtro.competencia}-01` : null;
    const ordem = fila ? sql`asc` : sql`desc`;
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<MovimentoComEtiquetas>`
        with movimentos as (
          select l.id, l.instituicao_id, l.natureza,
            case when l.natureza = 'RECEITA' then 'ENTRADA' else 'SAIDA' end as tipo,
            l.valor, l.motivo, l.registrado_em, l.data_competencia, l.competencia,
            l.registrado_por, l.origem, l.unidade_id, null::uuid as unidade_destino_id,
            l.conta_id, null::uuid as conta_destino_id, l.grupo_de_custo_id, l.evento_id, l.comprovante_id,
            l.data_caixa, l.forma_pagamento, l.pessoa_id, l.contraparte_texto, l.estorno_de_id,
            ${statusDoLancamento} as status, l.versao
          from financeiro.lancamento l
          where (${unidade}::uuid is null or l.unidade_id = ${unidade})
            and (${competencia}::date is null or l.competencia = ${competencia})
            and (not ${fila} or l.status = 'A_CONFERIR')
          union all
          select t.id, t.instituicao_id, null, 'TRANSFERENCIA', t.valor, t.motivo, t.registrado_em,
            t.data, date_trunc('month', t.data::timestamp)::date, t.registrado_por, 'MANUAL',
            t.unidade_id, t.unidade_destino_id, t.conta_origem_id, t.conta_destino_id,
            null, null, null, t.data, null, null, null, t.estorno_de_id,
            case when t.status = 'CONFIRMADO' and exists (
              select 1 from financeiro.transferencia estorno
              where estorno.estorno_de_id = t.id and estorno.instituicao_id = t.instituicao_id
                and estorno.status = 'CONFIRMADO'
            ) then 'ESTORNADO' else t.status end, t.versao
          from financeiro.transferencia t
          where (${unidade}::uuid is null or t.unidade_id = ${unidade} or t.unidade_destino_id = ${unidade})
            and (${competencia}::date is null or (t.data >= ${competencia}::date
              and t.data < ${competencia}::date + interval '1 month'))
            and (not ${fila} or t.status = 'A_CONFERIR')
          order by registrado_em ${ordem}, id ${ordem}, tipo ${ordem}
          limit ${filtro.limite + 1} offset ${deslocamento(filtro)}
        )
        select l.id, l.tipo, l.valor, l.motivo, l.status, l.versao, l.origem,
          to_char(l.registrado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "registradoEm",
          l.data_competencia as "dataCompetencia", to_char(l.competencia, 'YYYY-MM') as competencia,
          l.data_caixa as "dataCaixa", l.forma_pagamento as "formaPagamento",
          coalesce(pessoa.nome, l.contraparte_texto) as contraparte, l.estorno_de_id as "estornoDeId",
          u.nome as "registradoPor", l.unidade_id as "unidadeId", l.unidade_destino_id as "unidadeDestinoId",
          case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end as conta,
          case when d.id is not null then jsonb_build_object('id', d.id, 'nome', d.nome) end as "contaDestino",
          g.nome as grupo, e.nome as cerimonia, l.evento_id as "eventoId", l.comprovante_id as "comprovanteId",
          case when l.tipo <> 'TRANSFERENCIA' then ${pendenciaAberta} end as pendencia,
          coalesce(et.categorias, '{}') as categorias,
          coalesce(et.liquido = l.valor, false) as "etiquetasFecham"
        from movimentos l
        left join pessoas.pessoa pessoa on pessoa.id = l.pessoa_id and pessoa.instituicao_id = l.instituicao_id
        left join identidade.usuario u on u.id = l.registrado_por and u.instituicao_id = l.instituicao_id
        left join financeiro.conta c on c.id = l.conta_id and c.instituicao_id = l.instituicao_id
        left join financeiro.conta d on d.id = l.conta_destino_id and d.instituicao_id = l.instituicao_id
        left join financeiro.grupo_de_custo g on g.id = l.grupo_de_custo_id and g.instituicao_id = l.instituicao_id
        left join eventos.evento e on e.id = l.evento_id and e.instituicao_id = l.instituicao_id
        left join lateral (
          select array_agg(cat.nome order by cat.nome, cat.id) as categorias,
            sum(case when et.natureza = l.natureza then et.valor else -et.valor end) as liquido
          from financeiro.lancamento_categoria et
          join financeiro.categoria cat on cat.id = et.categoria_id and cat.instituicao_id = et.instituicao_id
          where l.tipo <> 'TRANSFERENCIA' and et.lancamento_id = l.id and et.instituicao_id = l.instituicao_id
        ) et on true
        order by l.registrado_em ${ordem}, l.id ${ordem}, l.tipo ${ordem}
      `.execute(kysely);
      return rows;
    });
  }
}
