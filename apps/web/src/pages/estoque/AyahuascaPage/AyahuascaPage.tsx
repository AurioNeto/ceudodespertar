import { Aviso, Button, CorpoDaTela, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
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

      <CorpoDaTela densidade={densidade} larguraMaxima={1080} espaco="compacto">
        {tela.mensagem ? (
          <Aviso tom="informacao" aoFechar={tela.fecharMensagem} rotuloDeFechar="fechar aviso">
            {tela.mensagem}
          </Aviso>
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
          <Aviso tom="pendente">
            {tela.previsto > tela.emEstoque
              ? `Os trabalhos da agenda pedem ${litros(tela.previsto)} e o estoque tem ${litros(tela.emEstoque)}. Faltam ${litros(tela.previsto - tela.emEstoque)} até o bailado de 27/09.`
              : `Há ${litros(tela.emQuarentena)} em quarentena, fora do estoque disponível.`}
          </Aviso>
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
      </CorpoDaTela>

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
