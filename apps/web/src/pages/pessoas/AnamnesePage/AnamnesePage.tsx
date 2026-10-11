import { Button, Icon, ScreenHeader, useDensidade, Interruptor, Select } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { CabecalhoDaVersao } from './components/CabecalhoDaVersao';
import { Cartao } from './components/Cartao';
import { HistoricoDaVersao } from './components/HistoricoDaVersao';
import { ListaDeVersoes } from './components/ListaDeVersoes';
import { PerguntasDaVersao } from './components/PerguntasDaVersao';
import { rotuloLabel } from './constantes';
import { useVersoesDoFormulario } from './hooks/useVersoesDoFormulario';

export function AnamnesePage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useVersoesDoFormulario();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-10' : 'F-10 · Anamnese'}
        title="Anamnese"
        subtitle={campo ? undefined : 'O formulário, suas versões e o que cada uma exige'}
        density={densidade}
        actions={
          <Button iconName="circle-plus" onClick={tela.criarRascunho}>
            Novo rascunho
          </Button>
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

        <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : '280px minmax(0,1fr)', gap: 16 }}>
          <ListaDeVersoes versoes={tela.versoes} selecionadaId={tela.versao.id} onSelecionar={tela.setSelecionada} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CabecalhoDaVersao
              versao={tela.versao}
              ehRascunho={tela.ehRascunho}
              onPublicar={tela.publicar}
              onCopiarLink={tela.copiarLink}
            />

            <PerguntasDaVersao
              perguntas={tela.versao.perguntas}
              ehRascunho={tela.ehRascunho}
              novaPergunta={tela.novaPergunta}
              onSubir={tela.subir}
              onDescer={tela.descer}
              onRemover={tela.remover}
              onAbrirNovaPergunta={tela.abrirNovaPergunta}
              onMudarNovaPergunta={tela.setNovaPergunta}
              onAdicionarPergunta={tela.adicionarPergunta}
              onCancelarNovaPergunta={tela.cancelarNovaPergunta}
            />

            <Cartao>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                Regras de validade e exigência
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                <Select
                  label="Anamnese vale por"
                  value={tela.validade}
                  options={[
                    { value: '6', label: '6 meses' },
                    { value: '12', label: '12 meses' },
                    { value: '24', label: '24 meses' },
                  ]}
                  onChange={tela.setValidade}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                      Exigir anamnese em dia para confirmar presença
                    </span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                      {tela.exigir
                        ? 'quem está vencido ou sem resposta não confirma inscrição'
                        : 'a confirmação passa mesmo com anamnese pendente'}
                    </span>
                  </span>
                  <Interruptor
                    ligado={tela.exigir}
                    onAlternar={tela.alternarExigir}
                    rotuloAcessivel="Exigir anamnese em dia para confirmar presença"
                  />
                </div>
              </div>
              {tela.publicada ? (
                <span style={{ ...rotuloLabel }}>
                  Em uso hoje: {tela.publicada.rotulo} · {pluralizar(tela.publicada.respostas, 'resposta')}
                </span>
              ) : null}
            </Cartao>

            <HistoricoDaVersao historico={tela.versao.historico} />
          </div>
        </div>
      </div>
    </>
  );
}
