import { ScreenHeader, useDensidade, Cartao, Numero, Recado } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { munay } from './mocks/contratacoes';
import { CartaoDeContratacao } from './components/CartaoDeContratacao';
import { DeQuemEIsso } from './components/DeQuemEIsso';
import { DoisLadosDaMesmaPalavra } from './components/DoisLadosDaMesmaPalavra';
import { Teto } from './components/Teto';
import { useContratacoes } from './hooks/useContratacoes';

/**
 * `E-13` · Contratações — Doc 4 §7 e Doc 2 §2.3.
 *
 * O que a Munay faz fora de casa, e a tela existe para desfazer um nó de uma
 * palavra só. **Cachê** aponta para os dois lados: o contratante paga a Munay
 * e a Munay paga os músicos. Mesmo evento, naturezas opostas — por isso são
 * duas categorias no plano de contas, e por isso aqui os dois lados aparecem
 * juntos, com o resultado embaixo.
 *
 * Fora do Acolhimento de propósito: negociar cachê com outra instituição é
 * ato comercial da Munay, não recepção.
 */

export function ContratacoesPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const tela = useContratacoes();

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-13' : 'E-13 · Contratações'}
        title="Contratações"
        subtitle={campo ? undefined : 'O que a Munay toca fora de casa · unidade comercial'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 26px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1020,
          minWidth: 0,
        }}
      >
        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        <DeQuemEIsso />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: campo ? 14 : 20,
            }}
          >
            <Numero
              rotulo="A receber"
              valor={formatarBRL(tela.totalAReceber)}
              nota={pluralizar(tela.aReceber.length, 'contratação confirmada', 'contratações confirmadas')}
              destaque
            />
            <Numero rotulo="Em proposta" valor={String(tela.propostas.length)} nota="ainda não é dinheiro" />
            <Numero
              rotulo="Faturamento no ano"
              valor={formatarBRL(munay.faturamentoNoAno)}
              nota={`de ${formatarBRL(munay.tetoAnual)} do teto do MEI`}
            />
          </div>
        </Cartao>

        <Teto aReceber={tela.totalAReceber} densidade={densidade} />

        {tela.lista.map((c) => (
          <CartaoDeContratacao
            key={c.eventoId}
            contratacao={c}
            densidade={densidade}
            recebendo={tela.recebendo === (c.eventoId as string)}
            conta={tela.conta}
            data={tela.data}
            onConta={tela.setConta}
            onData={tela.setData}
            onAbrir={() => tela.abrir(c)}
            onCancelarPainel={tela.cancelarPainel}
            onReceber={() => tela.receber(c)}
            onConfirmar={() => tela.confirmar(c)}
          />
        ))}

        <DoisLadosDaMesmaPalavra densidade={densidade} />
      </div>
    </>
  );
}
