import { Button, Icon, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
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
  const tela = useAgenda();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-01' : 'E-01 · Agenda'}
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
          tela.emDetalhe ? undefined : (
            <Button iconName="circle-plus" onClick={tela.novaCerimonia}>
              Nova cerimônia
            </Button>
          )
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

        {tela.emDetalhe ? (
          <DetalheDoTrabalho
            trabalho={tela.emDetalhe}
            feitos={tela.feitos}
            webhookAtivo={tela.webhookAtivo}
            campo={campo}
            onVoltar={tela.voltar}
            onAlternarTarefa={tela.alternarTarefa}
            onAlternarWebhook={tela.alternarWebhook}
            onEditar={tela.editar}
            onDuplicar={tela.duplicar}
            onCancelar={tela.cancelar}
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
      </div>

      {tela.form ? <FormularioDeTrabalho inicial={tela.form} onCancelar={tela.fecharFormulario} onSalvar={tela.salvar} /> : null}
    </>
  );
}
