import { Aviso, CorpoDaTela, Button, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { useSessao } from '@/app/sessao';
import { CalendarioMensal } from './components/CalendarioMensal';
import { DetalheDoTrabalho } from './components/DetalheDoTrabalho';
import { FormularioDeTrabalho } from './components/FormularioDeTrabalho';
import { LegendaDeTipos } from './components/LegendaDeTipos';
import { ListaDeTrabalhos } from './components/ListaDeTrabalhos';
import { NavegacaoDoMes } from './components/NavegacaoDoMes';
import { useAgenda } from './hooks/useAgenda';

export function AgendaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const { pode } = useSessao();
  const criaEvento = pode('eventos.evento.criar');
  const editaEvento = pode('eventos.evento.editar');
  const cancelaEvento = pode('eventos.evento.cancelar');
  const tela = useAgenda();

  return (
    <>
      <ScreenHeader
        title={tela.emDetalhe ? 'Cerimônia' : 'Agenda'}
        subtitle={
          tela.emDetalhe
            ? undefined
            : campo
              ? undefined
              : 'Os trabalhos do centro, no calendário ou em lista · CDD'
        }
        density={densidade}
        actions={
          tela.emDetalhe || !criaEvento ? undefined : (
            <Button iconName="circle-plus" onClick={tela.novaCerimonia}>
              Nova cerimônia
            </Button>
          )
        }
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1080} espaco="compacto">
        {tela.mensagem ? (
          <Aviso tom="informacao" comIcone={false} aoFechar={tela.fecharMensagem} rotuloDeFechar="fechar aviso">
            {tela.mensagem}
          </Aviso>
        ) : null}

        {tela.emDetalhe ? (
          <DetalheDoTrabalho
            trabalho={tela.emDetalhe}
            feitos={tela.feitos}
            webhookAtivo={tela.webhookAtivo}
            campo={campo}
            onVoltar={tela.voltar}
            onAlternarTarefa={editaEvento ? tela.alternarTarefa : undefined}
            onAlternarWebhook={editaEvento ? tela.alternarWebhook : undefined}
            onEditar={editaEvento ? tela.editar : undefined}
            onDuplicar={criaEvento ? tela.duplicar : undefined}
            onCancelar={cancelaEvento ? tela.cancelar : undefined}
            onAviso={tela.setMensagem}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <SeletorDeTipo
                opcoes={[
                  { valor: 'calendario', label: 'Calendário' },
                  { valor: 'lista', label: 'Lista' },
                ]}
                valor={tela.vista}
                onEscolher={tela.setVista}
                densidade={densidade}
              />

              {tela.vista === 'calendario' ? (
                <NavegacaoDoMes
                  ano={tela.ano}
                  mes={tela.mes}
                  doMes={tela.doMes}
                  densidade={densidade}
                  onNavegar={tela.navegarMes}
                />
              ) : null}
            </div>

            {tela.vista === 'calendario' ? (
              <>
                <CalendarioMensal ano={tela.ano} mes={tela.mes} trabalhos={tela.trabalhos} onAbrir={tela.setDetalheId} />
                <LegendaDeTipos />
              </>
            ) : (
              <ListaDeTrabalhos trabalhos={tela.ordenados} onAbrir={tela.setDetalheId} />
            )}
          </>
        )}
      </CorpoDaTela>

      {tela.form ? <FormularioDeTrabalho inicial={tela.form} onCancelar={tela.fecharFormulario} onSalvar={tela.salvar} /> : null}
    </>
  );
}
