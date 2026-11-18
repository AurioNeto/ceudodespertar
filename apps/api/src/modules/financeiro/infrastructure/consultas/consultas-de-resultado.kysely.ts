import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { DemonstrativoDeResultado, EventoId, FiltroDaDre, FiltroDeListaPorCompetencia, FiltroDeResultadoFinanceiro, LinhaDeResultado, PaginaFinanceira, ResumoDeResultadoDeCerimonia, ResultadoDeGrupo } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ConsultasDeResultado } from '../../application/consultas/consultas-financeiras.js';
import { centavos } from './centavos.js';

function efeitosPorCategoria(filtro: FiltroDeResultadoFinanceiro, eventoId: EventoId | null) {
  const unidade = filtro.unidadeId ?? null;
  const competencia = filtro.competencia ? `${filtro.competencia}-01` : null;
  return sql`
    select l.instituicao_id, l.unidade_id, l.competencia, l.grupo_de_custo_id, l.evento_id,
      e.natureza, e.categoria_id, case when l.estorno_de_id is null then e.valor else -e.valor end as valor
    from financeiro.lancamento l
    join financeiro.lancamento_categoria e on e.lancamento_id = l.id and e.instituicao_id = l.instituicao_id
    where l.status = 'CONFIRMADO'
      and (${unidade}::uuid is null or l.unidade_id = ${unidade})
      and (${competencia}::date is null or l.competencia = ${competencia})
      and (${eventoId}::uuid is null or l.evento_id = ${eventoId})
  `;
}

const totaisPorNatureza = sql`
  coalesce(sum(e.valor) filter (where e.natureza = 'RECEITA'), 0)::bigint as receitas,
  coalesce(sum(e.valor) filter (where e.natureza = 'DESPESA'), 0)::bigint as despesas,
  sum(case when e.natureza = 'RECEITA' then e.valor else -e.valor end)::bigint as resultado
`;

function demonstrativo(linhas: LinhaDeResultado[]): DemonstrativoDeResultado {
  let receitas = 0n;
  let despesas = 0n;
  for (const linha of linhas) {
    if (linha.natureza === 'RECEITA') receitas += BigInt(linha.valor);
    else despesas += BigInt(linha.valor);
  }
  return { linhas, receitas: centavos(receitas), despesas: centavos(despesas), resultado: centavos(receitas - despesas) };
}

@Injectable()
export class ConsultasDeResultadoKysely extends ConsultasDeResultado {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  dre(filtro: FiltroDaDre) {
    return this.demonstrativo(filtro, null);
  }

  porEvento(eventoId: EventoId, filtro: FiltroDeResultadoFinanceiro) {
    return this.demonstrativo(filtro, eventoId);
  }

  cerimonias(filtro: FiltroDeListaPorCompetencia): Promise<PaginaFinanceira<ResumoDeResultadoDeCerimonia>> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<ResumoDeResultadoDeCerimonia>`
        with efeitos as (${efeitosPorCategoria(filtro, null)})
        select jsonb_build_object(
          'id', evento.id, 'unidadeId', evento.unidade_id, 'nome', evento.nome,
          'tipo', evento.tipo, 'dataInicio', evento.data_inicio, 'dataFim', evento.data_fim
        ) as evento, ${totaisPorNatureza}
        from efeitos e
        join eventos.evento evento on evento.id = e.evento_id and evento.instituicao_id = e.instituicao_id
        group by evento.id
        order by evento.data_inicio desc, evento.id desc
        limit ${filtro.limite + 1} offset ${(filtro.pagina - 1) * filtro.limite}
      `.execute(kysely);
      return {
        itens: rows.slice(0, filtro.limite),
        proximaPagina: rows.length > filtro.limite ? filtro.pagina + 1 : null,
      };
    });
  }

  porGrupo(filtro: FiltroDeResultadoFinanceiro): Promise<readonly ResultadoDeGrupo[]> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<ResultadoDeGrupo>`
        with efeitos as (${efeitosPorCategoria(filtro, null)})
        select e.grupo_de_custo_id as "grupoDeCustoId", g.nome,
          ${totaisPorNatureza}
        from efeitos e
        left join financeiro.grupo_de_custo g on g.id = e.grupo_de_custo_id and g.instituicao_id = e.instituicao_id
        group by e.grupo_de_custo_id, g.nome
        order by g.nome nulls last, e.grupo_de_custo_id
      `.execute(kysely);
      return rows;
    });
  }

  private demonstrativo(filtro: FiltroDeResultadoFinanceiro, eventoId: EventoId | null): Promise<DemonstrativoDeResultado> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<LinhaDeResultado>`
        with efeitos as (${efeitosPorCategoria(filtro, eventoId)})
        select e.unidade_id as "unidadeId", to_char(e.competencia, 'YYYY-MM') as competencia,
          c.linha_relatorio as "linhaRelatorio", e.natureza, c.tipo, sum(e.valor)::bigint as valor
        from efeitos e
        join financeiro.categoria c on c.id = e.categoria_id and c.instituicao_id = e.instituicao_id
        group by e.unidade_id, e.competencia, c.linha_relatorio, e.natureza, c.tipo
        order by e.competencia, e.unidade_id, c.linha_relatorio, e.natureza, c.tipo
      `.execute(kysely);
      return demonstrativo(rows);
    });
  }
}
