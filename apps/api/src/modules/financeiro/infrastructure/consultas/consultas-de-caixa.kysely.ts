import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { DiaDeCaixa, FiltroDeUnidadeFinanceira, FiltroDoFluxoDeCaixa, FluxoDeCaixa, SaldoDeConta, SaldoDeFundo } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ConsultasDeCaixa } from '../../application/consultas/consultas-financeiras.js';
import { centavos } from './centavos.js';

function movimentos(filtro: FiltroDeUnidadeFinanceira) {
  const unidade = filtro.unidadeId ?? null;
  return sql`
    select l.instituicao_id, l.conta_id, l.natureza, l.data_caixa,
      coalesce(l.data_caixa, l.data_competencia) as data_movimento,
      (case when l.estorno_de_id is null then l.valor else -l.valor end) as valor
    from financeiro.lancamento l
    where l.status = 'CONFIRMADO' and l.conta_id is not null
      and (${unidade}::uuid is null or l.unidade_id = ${unidade})
    union all
    select t.instituicao_id, ponta.conta_id, 'TRANSFERENCIA', t.data, t.data,
      (case when t.estorno_de_id is null then ponta.valor else -ponta.valor end)
    from financeiro.transferencia t
    cross join lateral (values
      (t.conta_origem_id, t.unidade_id, -t.valor),
      (t.conta_destino_id, coalesce(t.unidade_destino_id, t.unidade_id), t.valor)
    ) as ponta(conta_id, unidade_id, valor)
    where t.status = 'CONFIRMADO' and ponta.conta_id is not null
      and (${unidade}::uuid is null or ponta.unidade_id = ${unidade})
  `;
}

function saldos(filtro: FiltroDeUnidadeFinanceira) {
  return sql`
    with movimentos as (${movimentos(filtro)})
    select instituicao_id, conta_id,
      sum(case when natureza = 'DESPESA' then -valor else valor end)::bigint as saldo,
      max(data_movimento) as ultimo_movimento
    from movimentos
    group by instituicao_id, conta_id
  `;
}

function fluxo(dias: DiaDeCaixa[]): FluxoDeCaixa {
  let entradas = 0n;
  let saidas = 0n;
  let transferencias = 0n;
  for (const dia of dias) {
    entradas += BigInt(dia.entradas);
    saidas += BigInt(dia.saidas);
    transferencias += BigInt(dia.transferenciasLiquidas);
  }
  return { dias, entradas: centavos(entradas), saidas: centavos(saidas), transferenciasLiquidas: centavos(transferencias),
    liquido: centavos(entradas - saidas + transferencias) };
}

@Injectable()
export class ConsultasDeCaixaKysely extends ConsultasDeCaixa {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  contas(filtro: FiltroDeUnidadeFinanceira): Promise<readonly SaldoDeConta[]> {
    const unidade = filtro.unidadeId ?? null;
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<SaldoDeConta>`
        with saldos as (${saldos(filtro)})
        select c.id, c.nome, c.descricao, c.tipo, c.titularidade, c.unidade_id as "unidadeId", c.ativa,
          coalesce(s.saldo, 0)::bigint as saldo, s.ultimo_movimento as "ultimoMovimento"
        from financeiro.conta c
        left join saldos s on s.conta_id = c.id and s.instituicao_id = c.instituicao_id
        where (${unidade}::uuid is null or c.unidade_id is null or c.unidade_id = ${unidade} or s.conta_id is not null)
        order by c.nome, c.id
      `.execute(kysely);
      return rows;
    });
  }

  fundos(filtro: FiltroDeUnidadeFinanceira): Promise<readonly SaldoDeFundo[]> {
    const unidade = filtro.unidadeId ?? null;
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<SaldoDeFundo>`
        with saldos as (${saldos(filtro)})
        select f.id, f.codigo_sistema as "codigoSistema", f.nome, f.nota, f.conta_vinculada_id as "contaVinculadaId",
          coalesce(s.saldo, 0)::bigint as "valorReservado", f.meta, f.ativo
        from financeiro.fundo f
        join financeiro.conta c on c.id = f.conta_vinculada_id and c.instituicao_id = f.instituicao_id
        left join saldos s on s.conta_id = c.id and s.instituicao_id = c.instituicao_id
        where (${unidade}::uuid is null or c.unidade_id is null or c.unidade_id = ${unidade} or s.conta_id is not null)
        order by f.nome, f.id
      `.execute(kysely);
      return rows;
    });
  }

  fluxo(filtro: FiltroDoFluxoDeCaixa): Promise<FluxoDeCaixa> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const { rows } = await sql<DiaDeCaixa>`
        with movimentos as (${movimentos(filtro)})
        select data_caixa as data,
          coalesce(sum(valor) filter (where natureza = 'RECEITA'), 0)::bigint as entradas,
          coalesce(sum(valor) filter (where natureza = 'DESPESA'), 0)::bigint as saidas,
          coalesce(sum(valor) filter (where natureza = 'TRANSFERENCIA'), 0)::bigint as "transferenciasLiquidas",
          sum(case when natureza = 'DESPESA' then -valor else valor end)::bigint as liquido
        from movimentos
        where data_caixa between ${filtro.de}::date and ${filtro.ate}::date
        group by data_caixa
        order by data_caixa
      `.execute(kysely);
      return fluxo(rows);
    });
  }
}
