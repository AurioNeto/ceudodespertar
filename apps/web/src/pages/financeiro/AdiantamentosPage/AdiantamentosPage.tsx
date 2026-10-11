import { Button, ScreenHeader, useDensidade, Cartao, Numero, Recado, Rotulo } from '@/ds';
import { formatarDinheiro, pluralizar } from '@/pages/utils/formato';
import { BlocoAusente } from './components/BlocoAusente';
import { FilaDeAutorizacao } from './components/FilaDeAutorizacao';
import { FilaDeRessarcimento } from './components/FilaDeRessarcimento';
import { FormularioDeAdiantamento } from './components/FormularioDeAdiantamento';
import { Linha } from './components/Linha';
import { SeletorDePerspectiva } from './components/SeletorDePerspectiva';
import { useAdiantamentos } from './hooks/useAdiantamentos';

export function AdiantamentosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useAdiantamentos();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-11' : 'F-11 · Adiantamentos e reembolsos'}
        title="Adiantamentos"
        subtitle={campo ? undefined : 'Quem tirou do próprio bolso e ainda não voltou · CDD'}
        density={densidade}
        actions={
          tela.quem.podeRegistrar ? (
            <Button variant="ghost" iconName="circle-plus" density={densidade} onClick={tela.alternarNovo}>
              Novo adiantamento
            </Button>
          ) : undefined
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1080,
          minWidth: 0,
        }}
      >
        <SeletorDePerspectiva atual={tela.quem} onTrocar={tela.trocarPerspectiva} densidade={densidade} />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: 16,
            }}
          >
            <Numero
              rotulo="Aguardando autorização"
              valor={String(tela.aguardando.length)}
              nota={tela.aguardando.length ? formatarDinheiro(tela.aguardando.reduce((s, a) => s + a.valor, 0)) : 'nada parado'}
              cor="var(--color-pending)"
            />
            <Numero
              rotulo="A ressarcir"
              valor={formatarDinheiro(tela.totalARessarcir)}
              nota={tela.maisAntigo > 0 ? `o mais antigo há ${pluralizar(tela.maisAntigo, 'dia')}` : 'nada pendente'}
              destaque
            />
            <Numero rotulo="Fechados" valor={String(tela.fechados.length)} nota="ressarcidos ou recusados" />
          </div>
        </Cartao>

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {tela.criando && tela.quem.podeRegistrar ? (
          <FormularioDeAdiantamento densidade={densidade} onConfirmar={tela.criar} onCancelar={tela.cancelarNovo} />
        ) : null}

        {/*
          Autorização — bloco governado por permissão. Quem não a tem não recebe
          a lista: ela não é escondida na tela, ela não é consultada.
        */}
        {tela.quem.podeAutorizar ? (
          <FilaDeAutorizacao
            densidade={densidade}
            quem={tela.quem}
            aguardando={tela.aguardando}
            barrado={tela.barrado}
            recusando={tela.recusando}
            motivoRecusa={tela.motivoRecusa}
            onAutorizar={tela.autorizar}
            onIniciarRecusa={tela.iniciarRecusa}
            onMotivoRecusa={tela.escolherMotivoRecusa}
            onRecusar={tela.recusar}
            onCancelarRecusa={tela.cancelarRecusa}
          />
        ) : (
          <BlocoAusente
            titulo="A fila de autorização não vem para o seu grupo"
            texto={`Autorizar adiantamento é da Governança e da Administração. ${tela.quem.grupo} não recebe esta lista — ela não é escondida na tela, ela não é consultada no servidor.`}
          />
        )}

        {tela.quem.podeLerReembolsos ? (
          <FilaDeRessarcimento
            densidade={densidade}
            podeRessarcir={tela.quem.podeRessarcir}
            aRessarcir={tela.aRessarcir}
            ressarcindo={tela.ressarcindo}
            conta={tela.contaRessarcimento}
            data={tela.dataRessarcimento}
            onIniciarRessarcimento={tela.iniciarRessarcimento}
            onConta={tela.escolherContaRessarcimento}
            onData={tela.escolherDataRessarcimento}
            onRessarcir={tela.ressarcir}
            onCancelarRessarcimento={tela.cancelarRessarcimento}
          />
        ) : null}

        {tela.fechados.length ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Rotulo>Fechados</Rotulo>
            {tela.fechados.map((a) => (
              <Linha key={a.id} adiantamento={a} densidade={densidade} />
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}
