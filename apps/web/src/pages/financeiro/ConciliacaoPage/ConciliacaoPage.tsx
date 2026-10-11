import { EmptyState, ScreenHeader, useDensidade, Numero, Recado } from '@/ds';
import { Coluna } from './components/Coluna';
import { LancamentoSozinho } from './components/LancamentoSozinho';
import { LinhaDoExtrato } from './components/LinhaDoExtrato';
import { PainelDeImportacao } from './components/PainelDeImportacao';
import { Sugestao } from './components/Sugestao';
import { useConciliacao } from './hooks/useConciliacao';

export function ConciliacaoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useConciliacao();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-25 · F-26' : 'F-25 e F-26 · Importação e conciliação'}
        title="Conciliação"
        subtitle={campo ? undefined : 'O extrato é a verdade bancária; o registro é a intenção · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1320,
          minWidth: 0,
        }}
      >
        <PainelDeImportacao
          densidade={densidade}
          importado={tela.importado}
          conta={tela.conta}
          onConta={tela.setConta}
          onImportar={tela.importar}
        />

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {!tela.importado ? null : (
          <>
            <div
              style={{
                background: 'var(--bg-card)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                padding: campo ? '15px 16px' : '17px 20px',
                display: 'grid',
                gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
                gap: 16,
              }}
            >
              <Numero rotulo="Sem par" valor={String(tela.totalPendente)} nota="linhas e lançamentos a resolver" destaque />
              <Numero rotulo="Sugestões" valor={String(tela.sugestoes.length)} nota="propostas pelo motor" cor="var(--color-suggest)" />
              <Numero rotulo="Conciliadas" valor={String(tela.conciliadas)} nota="nesta sessão" cor="var(--color-confirmed)" />
              <Numero rotulo="Ignoradas" valor={String(tela.ignoradas)} nota="com motivo registrado" />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.12fr) minmax(0,1fr)',
                gap: campo ? 16 : 18,
                alignItems: 'start',
              }}
            >
              <Coluna
                titulo="Saiu dinheiro que ninguém registrou"
                icone="arrow-down-left"
                cor="var(--color-attention)"
                contagem={tela.linhas.length}
                nota="Linhas do banco sem lançamento correspondente. É o problema de omissão saindo da invisibilidade."
              >
                {tela.linhas.length === 0 ? (
                  <EmptyState title="Nada sobrando do lado do banco" description="Toda linha do extrato encontrou seu par." />
                ) : (
                  tela.linhas.map((l) => (
                    <LinhaDoExtrato
                      key={l.id}
                      linha={l}
                      ignorando={tela.ignorando === l.id}
                      motivo={tela.motivo}
                      onMotivo={tela.setMotivo}
                      onIgnorar={() => tela.ignorar(l)}
                      onAbrirIgnorar={() => tela.abrirIgnorar(l.id)}
                      onCancelar={tela.cancelarIgnorar}
                    />
                  ))
                )}
              </Coluna>

              <Coluna
                titulo="Sugestões de casamento"
                icone="sparkles"
                cor="var(--color-suggest)"
                contagem={tela.sugestoes.length}
                nota="Por valor, proximidade de data e conta. O sistema propõe; quem confirma é você."
              >
                {tela.sugestoes.length === 0 ? (
                  <EmptyState title="Nenhuma sugestão aberta" description="O motor não encontra mais pares prováveis." />
                ) : (
                  tela.sugestoes.map((s) => (
                    <Sugestao key={s.linha.id} sugestao={s} onCasar={() => tela.casar(s)} onRecusar={() => tela.recusarSugestao(s)} />
                  ))
                )}
              </Coluna>

              <Coluna
                titulo="Registramos algo que não saiu do banco"
                icone="arrow-up-right"
                cor="var(--color-pending)"
                contagem={tela.lancamentos.length}
                nota="Lançamentos que o extrato não confirma. Pode ser espécie, cartão, ou erro de conta."
              >
                {tela.lancamentos.length === 0 ? (
                  <EmptyState title="Nada sobrando do lado do sistema" description="Todo lançamento encontrou sua linha." />
                ) : (
                  tela.lancamentos.map((lc) => <LancamentoSozinho key={lc.id} lancamento={lc} />)
                )}
              </Coluna>
            </div>
          </>
        )}
      </div>
    </>
  );
}
