import type { Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import type { DadosDaPrestacao, NivelDeDetalhe } from '../../mocks/prestacao';
import { Linha } from './components/Linha';
import { Secao } from './components/Secao';
import { Total } from './components/Total';

export interface DocumentoProps {
  dados: DadosDaPrestacao;
  nivel: NivelDeDetalhe;
  unidadeRotulo: string;
  densidade: Density;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
}

export function Documento({ dados, nivel, unidadeRotulo, densidade, totalReceitas, totalDespesas, resultado }: DocumentoProps) {
  const campo = densidade === 'field';
  return (
    <article
      style={{
        background: 'var(--bg-brand)',
        border: '1px solid var(--color-line-gold)',
        borderRadius: 'var(--radius)',
        padding: campo ? '20px 18px' : '30px 34px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        minWidth: 0,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span
          style={{
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-field-label)',
          }}
        >
          Céu do Despertar · Prestação de contas
        </span>
        <h2 style={{ font: 'var(--text-title)', color: 'var(--text-title)', margin: 0 }}>
          {dados.periodoRotulo}
        </h2>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {unidadeRotulo} · nível {nivel === 'RESUMO' ? 'resumo' : 'detalhado'}
        </span>
        <div style={{ height: 1, background: 'var(--color-line-gold)', marginTop: 5 }} />
      </header>

      <Secao titulo="Receitas" densidade={densidade}>
        {dados.receitas.map((l) => (
          <Linha key={l.rotulo} linha={l} nivel={nivel} />
        ))}
        <Total rotulo="Total de receitas" valor={totalReceitas} />
      </Secao>

      <Secao titulo="Despesas" densidade={densidade}>
        {dados.despesas.map((l) => (
          <Linha key={l.rotulo} linha={l} nivel={nivel} />
        ))}
        <Total rotulo="Total de despesas" valor={totalDespesas} />
      </Secao>

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--color-line-gold)',
          borderRadius: 'var(--radius)',
          padding: campo ? '14px 16px' : '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <span style={{ flex: 1, font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Resultado do período</span>
        <span
          data-numeric
          style={{
            font: 'var(--text-amount-lg)',
            color: resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
          }}
        >
          {resultado >= 0 ? '+ ' : '− '}
          {formatarDinheiro(Math.abs(resultado))}
        </span>
      </div>

      <Secao
        titulo="Movimentação patrimonial"
        nota="Não entra no resultado: empréstimo e adiantamento movem patrimônio, não receita nem despesa."
        densidade={densidade}
      >
        {dados.patrimonial.map((l) => (
          <Linha key={l.rotulo} linha={l} nivel={nivel} />
        ))}
      </Secao>

      <Secao titulo="Saldos por conta" densidade={densidade}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 4 }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>conta</span>
          <span style={{ display: 'flex', gap: campo ? 18 : 40 }}>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', width: campo ? 78 : 96, textAlign: 'right' }}>
              início
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', width: campo ? 78 : 96, textAlign: 'right' }}>
              fim
            </span>
          </span>
        </div>
        {dados.saldos.map((s) => (
          <div key={s.conta} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{s.conta}</span>
            <span style={{ display: 'flex', gap: campo ? 18 : 40 }}>
              <span
                data-numeric
                style={{ font: 'var(--text-amount)', color: 'var(--text-secondary)', width: campo ? 78 : 96, textAlign: 'right' }}
              >
                {formatarDinheiro(s.inicio)}
              </span>
              <span
                data-numeric
                style={{ font: 'var(--text-amount)', color: 'var(--text-primary)', width: campo ? 78 : 96, textAlign: 'right' }}
              >
                {formatarDinheiro(s.fim)}
              </span>
            </span>
          </div>
        ))}
        <Total
          rotulo="Saldo consolidado ao fim"
          valor={dados.saldos.reduce((s, c) => s + c.fim, 0)}
        />
      </Secao>

      <Secao titulo="Fundo próprio" nota="Parte do saldo com destinação já combinada." densidade={densidade}>
        <Linha linha={{ rotulo: 'Saldo do fundo', valor: dados.fundo.saldo }} nivel={nivel} />
        <Linha linha={{ rotulo: 'Aportes no período', valor: dados.fundo.aportes }} nivel={nivel} />
        <Linha linha={{ rotulo: 'Aplicações no período', valor: dados.fundo.aplicacoes }} nivel={nivel} />
      </Secao>

      <Secao titulo="Resultado por cerimônia" densidade={densidade}>
        {dados.cerimonias.map((c) => {
          const r = c.contribuicoes - c.custos;
          return (
            <div key={c.nome} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline' }}>
              <span style={{ flex: 1, minWidth: 180, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                {c.nome} · {c.data}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                contribuições {formatarDinheiro(c.contribuicoes)} · custos {formatarDinheiro(c.custos)}
              </span>
              <span
                data-numeric
                style={{
                  font: 'var(--text-amount)',
                  color: r >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
                  minWidth: 96,
                  textAlign: 'right',
                }}
              >
                {r >= 0 ? '+ ' : '− '}
                {formatarDinheiro(Math.abs(r))}
              </span>
            </div>
          );
        })}
      </Secao>

      <footer style={{ borderTop: '1px solid var(--color-line-gold)', paddingTop: 13 }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          Documento gerado sob demanda. O hash do conjunto de lançamentos entra no rodapé do arquivo exportado, e é por
          ele que duas prestações do mesmo período se conferem.
        </span>
      </footer>
    </article>
  );
}
