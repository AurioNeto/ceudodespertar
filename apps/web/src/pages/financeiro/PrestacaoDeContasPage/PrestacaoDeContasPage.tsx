import { Button, ScreenHeader, useDensidade, Select, SeletorDeTipo, Recado, Rotulo } from '@/ds';
import { Documento } from './components/Documento';
import { ExplicacaoDoNivel } from './components/ExplicacaoDoNivel';
import { HistoricoDePrestacoes } from './components/HistoricoDePrestacoes';
import { usePrestacao } from './hooks/usePrestacao';

export function PrestacaoDeContasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = usePrestacao();

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
              value={tela.periodoChave}
              options={tela.periodos.map((p) => ({ value: p.chave, label: p.rotulo }))}
              onChange={tela.setPeriodoChave}
            />
            <Select
              label="Unidade"
              value={tela.unidade}
              options={tela.unidades.map((u) => ({ value: u.chave, label: u.rotulo }))}
              onChange={tela.setUnidade}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Rotulo>Nível de detalhe</Rotulo>
            <SeletorDeTipo
              opcoes={[
                { valor: 'RESUMO', label: 'Resumo · sem nomes' },
                { valor: 'DETALHADO', label: 'Detalhado · uso interno' },
              ]}
              valor={tela.nivel}
              onEscolher={tela.setNivel}
              densidade={densidade}
            />
            <ExplicacaoDoNivel nivel={tela.nivel} suprimidas={tela.linhasNominais} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Button iconName="file-down" onClick={() => tela.gerar('PDF')} density={densidade}>
              Gerar PDF
            </Button>
            <Button variant="ghost" iconName="file-spreadsheet" onClick={() => tela.gerar('Planilha')} density={densidade}>
              Gerar planilha
            </Button>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '48ch' }}>
              Toda prestação gerada fica registrada com autor, data e hash.
            </span>
          </div>
        </div>

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <Documento
          dados={tela.dados}
          nivel={tela.nivel}
          unidadeRotulo={tela.unidadeRotulo}
          densidade={densidade}
          totalReceitas={tela.totalReceitas}
          totalDespesas={tela.totalDespesas}
          resultado={tela.resultado}
        />

        <HistoricoDePrestacoes historico={tela.historico} />
      </div>
    </>
  );
}
