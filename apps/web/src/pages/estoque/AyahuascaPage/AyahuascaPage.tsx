import { Button, Icon, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { AbaDeLotes } from './components/AbaDeLotes';
import { AbaDeMovimentos } from './components/AbaDeMovimentos';
import { AbaDeReservas } from './components/AbaDeReservas';
import { FichaDoLote } from './components/FichaDoLote';
import { Kpi } from './components/Kpi';
import { ModalDeMovimento } from './components/ModalDeMovimento';
import { useEstoqueDeDaime } from './hooks/useEstoqueDeDaime';
import { litros } from './utils/litros';

export function AyahuascaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useEstoqueDeDaime();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-02' : 'E-02 · Ayahuasca'}
        title="Ayahuasca"
        subtitle={campo ? undefined : 'Lotes, movimentos e reservas por trabalho · CDD'}
        density={densidade}
        actions={
          <>
            <Button iconName="plus" onClick={() => tela.abrirFormulario('feitio')}>
              Entrada de feitio
            </Button>
            <Button variant="ghost" iconName="minus" onClick={() => tela.abrirFormulario('saida')}>
              Registrar saída
            </Button>
            <Button variant="ghost" iconName="arrow-left-right" onClick={() => tela.abrirFormulario('transferencia')}>
              Transferir
            </Button>
          </>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 1080,
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
            <button type="button" aria-label="fechar aviso" onClick={tela.fecharMensagem} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <Kpi
            rotulo="Em estoque"
            valor={litros(tela.emEstoque)}
            nota={pluralizar(tela.lotes.filter((l) => l.restante > 0).length, 'lote com daime', 'lotes com daime')}
          />
          <Kpi rotulo="Reservado" valor={litros(tela.reservadoTotal)} nota="separado para trabalhos confirmados" cor="var(--text-primary)" />
          <Kpi
            rotulo="Livre"
            valor={litros(tela.livre)}
            nota={tela.livre >= 0 ? 'disponível para novas reservas' : 'reservas passam do estoque'}
            cor={tela.livre >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)'}
          />
          <Kpi
            rotulo="Previsto até out."
            valor={litros(tela.previsto)}
            nota={pluralizar(tela.reservas.length, 'trabalho na agenda', 'trabalhos na agenda')}
            cor="var(--text-primary)"
          />
        </div>

        {tela.previsto > tela.emEstoque || tela.emQuarentena > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-pending-soft)',
              border: '1px solid var(--color-pending-border)',
              borderRadius: 'var(--radius)',
              padding: '11px 14px',
            }}
          >
            <Icon name="triangle-alert" size={18} color="var(--color-pending)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
              {tela.previsto > tela.emEstoque
                ? `Os trabalhos da agenda pedem ${litros(tela.previsto)} e o estoque tem ${litros(tela.emEstoque)}. Faltam ${litros(tela.previsto - tela.emEstoque)} até o bailado de 27/09.`
                : `Há ${litros(tela.emQuarentena)} em quarentena, fora do estoque disponível.`}
            </span>
          </div>
        ) : null}

        <SeletorDeTipo
          opcoes={[
            { valor: 'lotes', label: 'Lotes' },
            { valor: 'movimentos', label: 'Movimentos' },
            { valor: 'reservas', label: 'Reservas' },
          ]}
          valor={tela.aba}
          onEscolher={tela.setAba}
          densidade={densidade}
        />

        {tela.aba === 'lotes' ? <AbaDeLotes lotes={tela.lotes} densidade={densidade} onAbrir={tela.setDetalheId} /> : null}

        {tela.aba === 'movimentos' ? <AbaDeMovimentos movimentos={tela.movimentos} lotes={tela.lotes} densidade={densidade} /> : null}

        {tela.aba === 'reservas' ? (
          <AbaDeReservas reservas={tela.reservas} reservado={tela.reservado} onAlternar={tela.alternarReserva} />
        ) : null}
      </div>

      {tela.detalhe ? (
        <FichaDoLote
          lote={tela.detalhe}
          movimentos={tela.movimentosDoDetalhe}
          densidade={densidade}
          onFechar={tela.fecharDetalhe}
          onQuarentena={tela.alternarQuarentena}
        />
      ) : null}

      {tela.form ? (
        <ModalDeMovimento
          form={tela.form}
          erro={tela.erro}
          lotes={tela.disponiveis}
          onMudar={tela.setForm}
          onCancelar={tela.cancelarFormulario}
          onSalvar={tela.salvar}
        />
      ) : null}
    </>
  );
}
