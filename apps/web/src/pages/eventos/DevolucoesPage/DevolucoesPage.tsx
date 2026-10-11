import { Icon, ScreenHeader, useDensidade, Cartao, Numero, Recado } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { CartaoDeDevolucao } from './components/CartaoDeDevolucao';
import { ComoEntraNoResultado } from './components/ComoEntraNoResultado';
import { Espelho } from './components/Espelho';
import { FaltaramSemPedir } from './components/FaltaramSemPedir';
import { JaPagas } from './components/JaPagas';
import { useDevolucoes } from './hooks/useDevolucoes';
import { diasEsperando } from './utils/diasEsperando';

/**
 * `E-09` · Devoluções a pagar — Doc 4 §7 e Doc 2 §2.9.
 *
 * A metade financeira de um ato que acontece em duas telas e duas pessoas
 * (DV3): o Acolhimento cancela a inscrição e registra que a pessoa **pediu** o
 * dinheiro de volta; a Tesouraria paga. O Acolhimento não vê esta tela, e é
 * assim que a fronteira "sem acesso a saídas financeiras do evento" deixa de
 * ser um aviso e vira desenho.
 *
 * Quem falta e não pede não aparece na fila (DV1) — aparece no rodapé, como
 * contexto, para que a ausência seja visível em vez de virar dúvida.
 */

export function DevolucoesPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useDevolucoes();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-09' : 'E-09 · Devoluções a pagar'}
        title="Devoluções a pagar"
        subtitle={campo ? undefined : 'O que o Acolhimento pediu e a Tesouraria paga · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 26px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 980,
          minWidth: 0,
        }}
      >
        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <Espelho />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: campo ? 14 : 20,
            }}
          >
            <Numero rotulo="A devolver" valor={formatarBRL(tela.total)} nota={pluralizar(tela.fila.length, 'pedido')} destaque />
            <Numero
              rotulo="Esperando há mais tempo"
              valor={tela.maisAntiga ? pluralizar(diasEsperando(tela.maisAntiga.solicitadaEm), 'dia') : '—'}
              nota={tela.maisAntiga ? tela.maisAntiga.nome : 'fila vazia'}
              cor={tela.maisAntiga && diasEsperando(tela.maisAntiga.solicitadaEm) > 30 ? 'var(--color-attention)' : undefined}
            />
            <Numero rotulo="Devolvidas este ano" valor={String(tela.pagas.length)} nota="já pagas e estornadas" />
          </div>
        </Cartao>

        {tela.fila.length === 0 ? (
          <Cartao campo={campo} style={{ gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Icon name="circle-check" size={19} color="var(--color-confirmed)" />
              <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Ninguém esperando</span>
            </div>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Toda devolução pedida já foi paga. A fila vazia é o estado normal, não uma conquista.
            </span>
          </Cartao>
        ) : (
          tela.fila.map((d) => (
            <CartaoDeDevolucao
              key={d.id}
              devolucao={d}
              densidade={densidade}
              pagando={tela.pagando === (d.id as string)}
              conta={tela.conta}
              data={tela.data}
              onConta={tela.setConta}
              onData={tela.setData}
              onAbrir={() => tela.abrir(d)}
              onCancelar={tela.cancelarPagamento}
              onPagar={() => tela.pagar(d)}
            />
          ))
        )}

        <ComoEntraNoResultado densidade={densidade} />

        <FaltaramSemPedir densidade={densidade} />

        {tela.pagas.length > 0 ? <JaPagas lista={tela.pagas} densidade={densidade} /> : null}
      </div>
    </>
  );
}
