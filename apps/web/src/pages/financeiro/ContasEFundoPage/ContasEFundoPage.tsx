import { Button, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { GerenciarContasModal } from './components/GerenciarContasModal';
import { ResumoDoSaldo } from './components/ResumoDoSaldo';
import { FundoProprio } from './components/FundoProprio';
import { CartaoDeConta } from './components/CartaoDeConta';
import { rotuloLabel } from './constantes';
import { useContasEFundos } from './hooks/useContasEFundos';

export function ContasEFundoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useContasEFundos();

  const mostrarContas = !campo || tela.aba === 'contas';
  const mostrarFundo = !campo || tela.aba === 'fundo';

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-04' : 'F-04 · Contas e fundo'}
        title="Contas e fundo"
        subtitle={campo ? undefined : 'Saldo por conta e destino do fundo próprio · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 22px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 20,
          maxWidth: campo ? undefined : 1000,
        }}
      >
        <ResumoDoSaldo
          contasAtivas={tela.contasAtivas}
          emBanco={tela.emBanco}
          emCaixa={tela.emCaixa}
          fundoProprio={tela.fundoProprio}
          densidade={densidade}
        />

        {campo ? (
          <SeletorDeTipo
            opcoes={[
              { valor: 'contas', label: 'Contas' },
              { valor: 'fundo', label: 'Fundo' },
            ]}
            valor={tela.aba}
            onEscolher={tela.escolherAba}
            densidade={densidade}
          />
        ) : null}

        {mostrarContas ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              {campo ? null : <span style={rotuloLabel}>Contas</span>}
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {pluralizar(tela.pendentes, 'conta esperando conferência', 'contas esperando conferência')}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" iconName="settings-2" onClick={tela.abrirGerenciador}>
                  Gerenciar contas e fundos
                </Button>
                {campo ? null : (
                  <Button variant="ghost" iconName="arrow-left-right">
                    Transferir entre contas
                  </Button>
                )}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              {tela.contasAtivas.map((c) => (
                <CartaoDeConta key={c.id} conta={c} />
              ))}
            </div>
          </div>
        ) : null}

        {mostrarFundo ? (
          <FundoProprio
            fundoProprio={tela.fundoProprio}
            comprometido={tela.comprometido}
            livre={tela.livre}
            reservas={tela.reservas}
            densidade={densidade}
          />
        ) : null}
      </div>

      {tela.gerenciando ? (
        <GerenciarContasModal
          contas={tela.contas}
          fundos={tela.fundos}
          onFechar={tela.fecharGerenciador}
          onSalvarConta={tela.salvarConta}
          onSalvarFundo={tela.salvarFundo}
          onAlternarConta={tela.alternarConta}
          onAlternarFundo={tela.alternarFundo}
        />
      ) : null}
    </div>
  );
}
