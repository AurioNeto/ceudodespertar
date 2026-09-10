import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarDinheiro } from '../../lib/formato';
import {
  gerarHash,
  historico as historicoInicial,
  periodos,
  soma,
  unidades,
  type DadosDaPrestacao,
  type LinhaDePrestacao,
  type NivelDeDetalhe,
  type PrestacaoGerada,
} from '../../mocks/prestacao';

export function PrestacaoDeContasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [periodoChave, setPeriodoChave] = useState(periodos[0]!.chave);
  const [unidade, setUnidade] = useState(unidades[0]!.chave);
  const [nivel, setNivel] = useState<NivelDeDetalhe>('RESUMO');
  const [historico, setHistorico] = useState<readonly PrestacaoGerada[]>(historicoInicial);
  const [recado, setRecado] = useState<string | null>(null);

  const periodo = periodos.find((p) => p.chave === periodoChave)!;
  const dados = periodo.dados;
  const unidadeRotulo = unidades.find((u) => u.chave === unidade)!.rotulo;

  const totalReceitas = soma(dados.receitas);
  const totalDespesas = soma(dados.despesas);
  const resultado = totalReceitas - totalDespesas;

  /** Quantas linhas o resumo suprime — o número que justifica os dois níveis. */
  const linhasNominais = [...dados.receitas, ...dados.despesas, ...dados.patrimonial].filter((l) => l.nominal).length;

  const gerar = (formato: 'PDF' | 'Planilha') => {
    const hash = gerarHash();
    setHistorico((lista) => [
      {
        id: `p-${Date.now()}`,
        periodo: periodo.chave as PrestacaoGerada['periodo'],
        periodoRotulo: periodo.rotulo,
        unidade: unidade === 'consolidado' ? 'Consolidado' : unidade,
        nivel,
        geradaPor: 'Aurio Neto',
        geradaEm: '10/09/2026, 14:22',
        formato,
        hash,
      },
      ...lista,
    ]);
    setRecado(
      `Prestação de ${periodo.rotulo} gerada em ${formato.toLowerCase()}, nível ${nivel === 'RESUMO' ? 'resumo' : 'detalhado'}. Ficou registrada com o hash ${hash} — é por ele que dois pedidos se conferem entre si.`,
    );
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-24' : 'F-24 · Prestação de contas'}
        title="Prestação de contas"
        subtitle={campo ? undefined : 'Exportação sob demanda, quando alguém pede · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1100,
          minWidth: 0,
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: campo ? '15px 16px' : '17px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 15,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 14 }}>
            <Select
              label="Período"
              value={periodoChave}
              options={periodos.map((p) => ({ value: p.chave, label: p.rotulo }))}
              onChange={setPeriodoChave}
            />
            <Select
              label="Unidade"
              value={unidade}
              options={unidades.map((u) => ({ value: u.chave, label: u.rotulo }))}
              onChange={setUnidade}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Rotulo>Nível de detalhe</Rotulo>
            <SeletorDeTipo
              opcoes={[
                { valor: 'RESUMO', label: 'Resumo · sem nomes' },
                { valor: 'DETALHADO', label: 'Detalhado · uso interno' },
              ]}
              valor={nivel}
              onEscolher={setNivel}
              densidade={densidade}
            />
            <ExplicacaoDoNivel nivel={nivel} suprimidas={linhasNominais} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Button iconName="file-down" onClick={() => gerar('PDF')} density={densidade}>
              Gerar PDF
            </Button>
            <Button variant="ghost" iconName="file-spreadsheet" onClick={() => gerar('Planilha')} density={densidade}>
              Gerar planilha
            </Button>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '48ch' }}>
              Toda prestação gerada fica registrada com autor, data e hash.
            </span>
          </div>
        </div>

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        <Documento
          dados={dados}
          nivel={nivel}
          unidadeRotulo={unidadeRotulo}
          campo={campo}
          totalReceitas={totalReceitas}
          totalDespesas={totalDespesas}
          resultado={resultado}
        />

        <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Rotulo>Prestações já geradas</Rotulo>
          {historico.map((h) => (
            <div
              key={h.id}
              style={{
                background: 'var(--bg-card)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                padding: '12px 15px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <Icon name="file-down" size={17} color="var(--text-meta)" />
              <span style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                    {h.periodoRotulo} · {h.unidade}
                  </span>
                  <StatusBadge tone={h.nivel === 'RESUMO' ? 'confirmed' : 'pending'}>
                    {h.nivel === 'RESUMO' ? 'Resumo' : 'Detalhado'}
                  </StatusBadge>
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  {h.formato} · {h.geradaPor} · {h.geradaEm}
                </span>
              </span>
              <code style={{ font: 'var(--text-code)' }}>{h.hash}</code>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function ExplicacaoDoNivel({ nivel, suprimidas }: { nivel: NivelDeDetalhe; suprimidas: number }) {
  const resumo = nivel === 'RESUMO';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: resumo ? 'var(--color-confirmed-soft)' : 'var(--color-pending-soft)',
        border: `1px solid ${resumo ? 'var(--color-confirmed-border)' : 'var(--color-pending-border)'}`,
        borderRadius: 'var(--radius)',
        padding: '11px 14px',
      }}
    >
      <Icon
        name={resumo ? 'shield-half' : 'triangle-alert'}
        size={17}
        color={resumo ? 'var(--color-confirmed)' : 'var(--color-pending)'}
        style={{ marginTop: 1 }}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
        {resumo ? (
          <>
            <b>Nomes de pessoas físicas não aparecem.</b> {suprimidas} linhas deste período trocam o nome pelo agregado —
            “empréstimo concedido a Fulano” vira “empréstimos concedidos”. Presta a mesma conta sem expor ninguém, e é o
            nível que se entrega a quem pede.
          </>
        ) : (
          <>
            <b>Este nível mostra nomes e é de uso interno.</b> Fica restrito a administração, tesouraria e governança —
            não é o documento que se entrega na assembleia.
          </>
        )}
      </span>
    </div>
  );
}

interface DocumentoProps {
  dados: DadosDaPrestacao;
  nivel: NivelDeDetalhe;
  unidadeRotulo: string;
  campo: boolean;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
}

function Documento({ dados, nivel, unidadeRotulo, campo, totalReceitas, totalDespesas, resultado }: DocumentoProps) {
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

      <Secao titulo="Receitas" campo={campo}>
        {dados.receitas.map((l) => (
          <Linha key={l.rotulo} linha={l} nivel={nivel} />
        ))}
        <Total rotulo="Total de receitas" valor={totalReceitas} />
      </Secao>

      <Secao titulo="Despesas" campo={campo}>
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
        campo={campo}
      >
        {dados.patrimonial.map((l) => (
          <Linha key={l.rotulo} linha={l} nivel={nivel} />
        ))}
      </Secao>

      <Secao titulo="Saldos por conta" campo={campo}>
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

      <Secao titulo="Fundo próprio" nota="Parte do saldo com destinação já combinada." campo={campo}>
        <Linha linha={{ rotulo: 'Saldo do fundo', valor: dados.fundo.saldo }} nivel={nivel} />
        <Linha linha={{ rotulo: 'Aportes no período', valor: dados.fundo.aportes }} nivel={nivel} />
        <Linha linha={{ rotulo: 'Aplicações no período', valor: dados.fundo.aplicacoes }} nivel={nivel} />
      </Secao>

      <Secao titulo="Resultado por cerimônia" campo={campo}>
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

function Secao({
  titulo,
  nota,
  campo,
  children,
}: {
  titulo: string;
  nota?: string;
  campo: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: campo ? 8 : 9, minWidth: 0 }}>
      <Rotulo>{titulo}</Rotulo>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      {children}
    </section>
  );
}

function Linha({ linha, nivel }: { linha: LinhaDePrestacao; nivel: NivelDeDetalhe }) {
  const mostrarNome = nivel === 'DETALHADO' && linha.nominal;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{linha.rotulo}</span>
        {mostrarNome ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-pending)' }}>{linha.nominal}</span>
        ) : null}
      </span>
      <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        {formatarDinheiro(linha.valor)}
      </span>
    </div>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--color-line-gold)',
        paddingTop: 8,
        marginTop: 3,
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rotulo}</span>
      <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
        {formatarDinheiro(valor)}
      </span>
    </div>
  );
}
