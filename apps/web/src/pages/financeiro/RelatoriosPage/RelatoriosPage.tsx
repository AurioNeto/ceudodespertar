import { Button, Icon, ScreenHeader, useDensidade } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { CartoesDeKpi } from './components/CartoesDeKpi';
import { CustoPorCerimonia } from './components/CustoPorCerimonia';
import { GavetaDeRecorte } from './components/GavetaDeRecorte';
import { GraficoSerie } from './components/GraficoSerie';
import { MetasDoFundo } from './components/MetasDoFundo';
import { MovimentoPorConta } from './components/MovimentoPorConta';
import { PainelDeFiltros } from './components/PainelDeFiltros';
import { PainelDeQuebra } from './components/PainelDeQuebra';
import { SituacaoDoRecorte } from './components/SituacaoDoRecorte';
import { useTelaDeRelatorios } from './hooks/useTelaDeRelatorios';

export function RelatoriosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useTelaDeRelatorios();
  const r = tela.relatorio;

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-06' : 'F-06 · Relatórios'}
        title="Relatórios"
        subtitle={campo ? undefined : 'Período, unidade e recorte — do total ao lançamento'}
        density={densidade}
        actions={
          <>
            <Button variant="ghost" iconName="file-down" onClick={() => tela.avisar(`Relatório de ${r.rotuloPeriodo} preparado em PDF.`)}>
              PDF
            </Button>
            <Button
              variant="ghost"
              iconName="file-spreadsheet"
              onClick={() =>
                tela.avisar(`Planilha de ${r.rotuloPeriodo} gerada com ${pluralizar(r.atual.length, 'lançamento')}.`)
              }
            >
              Planilha
            </Button>
          </>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 22px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: campo ? undefined : 1120,
        }}
      >
        {tela.mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{tela.mensagem}</span>
            <button type="button" aria-label="fechar aviso" onClick={tela.fecharAviso} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <PainelDeFiltros relatorio={r} resumoDoRecorte={tela.resumoDoRecorte} densidade={densidade} />

        <SituacaoDoRecorte aConferir={r.aConferir} valorAConferir={r.valorAConferir} />

        <CartoesDeKpi kpis={tela.kpis} comparar={r.comparar} densidade={densidade} />

        <GraficoSerie
          serie={r.serie}
          acumulados={r.acumulados}
          escala={r.escala}
          rotuloPeriodo={r.rotuloPeriodo}
          campo={campo}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <PainelDeQuebra
            titulo="Saídas por grupo"
            itens={r.porGrupo}
            campo={campo}
            onAbrir={(nome) => tela.abrirDrill({ rotulo: 'Saídas do grupo', campo: 'grupo', valor: nome, tipo: 'saida' })}
          />
          <PainelDeQuebra
            titulo="Saídas por categoria"
            itens={r.porCategoria}
            campo={campo}
            onAbrir={(nome) =>
              tela.abrirDrill({ rotulo: 'Saídas da categoria', campo: 'categoria', valor: nome, tipo: 'saida' })
            }
          />
        </div>

        <MovimentoPorConta
          porConta={r.porConta}
          rotuloPeriodo={r.rotuloPeriodo}
          densidade={densidade}
          onAbrirDrill={tela.abrirDrill}
          onAvisar={tela.avisar}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <MetasDoFundo />

          <CustoPorCerimonia porCerimonia={r.porCerimonia} onAbrirDrill={tela.abrirDrill} />
        </div>
      </div>

      {tela.drill ? (
        <GavetaDeRecorte
          drill={tela.drill}
          linhasDoDrill={tela.linhasDoDrill}
          totalDoDrill={tela.totalDoDrill}
          rotuloPeriodo={r.rotuloPeriodo}
          densidade={densidade}
          onFechar={tela.fecharDrill}
          onAvisar={tela.avisar}
        />
      ) : null}
    </div>
  );
}
