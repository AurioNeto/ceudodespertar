import { Button, Cartao, Icon, Rotulo, StatusBadge, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { FORMA_EXPLICACAO, FORMA_ROTULO, STATUS_ROTULO, TOM } from '../../constantes';
import type { ContratacaoNaTela } from '../../mocks/contratacoes';
import { resultadoDaContratacao } from '../../utils/resultadoDaContratacao';
import { Devolucao } from './components/Devolucao';
import { Lado } from './components/Lado';
import { Linha } from './components/Linha';
import { PainelDeRecebimento } from './components/PainelDeRecebimento';

export interface CartaoDeContratacaoProps {
  contratacao: ContratacaoNaTela;
  densidade: Density;
  recebendo: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onAbrir: () => void;
  onCancelarPainel: () => void;
  onReceber: () => void;
  onConfirmar: () => void;
}

export function CartaoDeContratacao({
  contratacao: c,
  densidade,
  recebendo,
  conta,
  data,
  onConta,
  onData,
  onAbrir,
  onCancelarPainel,
  onReceber,
  onConfirmar,
}: CartaoDeContratacaoProps) {
  const campo = densidade === 'field';
  const { totalCaches, totalCustos, entrou, resultado } = resultadoDaContratacao(c);
  const cancelada = c.status === 'CANCELADA';

  return (
    <Cartao campo={campo} style={{ gap: 14, opacity: cancelada ? 0.9 : 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{c.contratante}</span>
        <StatusBadge tone={TOM[c.status]}>{STATUS_ROTULO[c.status]}</StatusBadge>
        {c.documento ? (
          <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            CNPJ {c.documento}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
          {formatarBRL(c.valorAcordado)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        <Linha rotulo="Evento">
          {c.evento} · {c.data}
        </Linha>
        <Linha rotulo="Onde">{c.local}</Linha>
        <Linha rotulo="Forma de pagamento">
          {FORMA_ROTULO[c.formaPagamento]} · {FORMA_EXPLICACAO[c.formaPagamento]}
        </Linha>
        {c.dataPrevistaPagamento ? <Linha rotulo="Previsto para">{c.dataPrevistaPagamento}</Linha> : null}
      </div>

      {cancelada ? null : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? '1fr' : '1fr 1fr',
            gap: campo ? 12 : 16,
          }}
        >
          <Lado
            titulo="Entra · o contratante paga a Munay"
            categoria="Cachê de contratação"
            natureza="receita"
            cor="var(--color-confirmed)"
            total={c.valorAcordado}
            nota={
              c.recebidoEm
                ? `Recebido em ${c.recebidoEm} · ${c.lancamentoReceitaId}`
                : 'Ainda não virou lançamento — receita só existe depois do recebimento.'
            }
          >
            {null}
          </Lado>

          <Lado
            titulo="Sai · a Munay paga os músicos"
            categoria="Cachê a músico"
            natureza="despesa"
            cor="var(--color-attention)"
            total={totalCaches}
            nota={
              c.caches.length === 0
                ? 'Nenhum cachê combinado ainda.'
                : `${pluralizar(c.caches.filter((m) => m.pago).length, 'cachê pago', 'cachês pagos')} de ${c.caches.length}`
            }
          >
            {c.caches.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                {c.caches.map((m) => (
                  <div key={m.nome} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Icon
                      name={m.pago ? 'circle-check' : 'circle-alert'}
                      size={13}
                      color={m.pago ? 'var(--color-confirmed)' : 'var(--text-meta)'}
                    />
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)', flex: 1, minWidth: 110 }}>
                      {m.nome}
                    </span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{m.funcao}</span>
                    <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                      {formatarBRL(m.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </Lado>
        </div>
      )}

      {c.custos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Rotulo>Outros custos do evento</Rotulo>
          {c.custos.map((x) => (
            <div key={x.descricao} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1 }}>
                {x.descricao}
              </span>
              <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {formatarBRL(x.valor)}
              </span>
            </div>
          ))}
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Apurados por evento, como em qualquer trabalho da casa.
          </span>
        </div>
      ) : null}

      {cancelada ? null : (
        <div
          style={{
            background: 'var(--bg-sunken)',
            borderRadius: 'var(--radius)',
            padding: '11px 14px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px 12px',
            alignItems: 'baseline',
          }}
        >
          <Rotulo>Resultado do evento</Rotulo>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
            {formatarBRL(c.valorAcordado)} − {formatarBRL(totalCaches)} de cachês − {formatarBRL(totalCustos)} de
            custos
          </span>
          <span
            data-numeric
            style={{
              font: 'var(--text-amount)',
              color: resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
            }}
          >
            {formatarBRL(resultado)}
          </span>
        </div>
      )}

      {c.devolucaoDevida ? <Devolucao c={c} /> : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.observacoes}</span>

      {recebendo ? (
        <PainelDeRecebimento
          contratacao={c}
          densidade={densidade}
          conta={conta}
          data={data}
          onConta={onConta}
          onData={onData}
          onCancelar={onCancelarPainel}
          onReceber={onReceber}
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {c.status === 'PROPOSTA' ? (
            <>
              <Button iconName="check" density={campo ? 'field' : 'office'} onClick={onConfirmar}>
                Confirmar a proposta
              </Button>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                Confirmar não move dinheiro. Proposta não é receita.
              </span>
            </>
          ) : null}
          {c.status === 'CONFIRMADA' && !c.recebidoEm ? (
            <Button iconName="arrow-down-left" density={campo ? 'field' : 'office'} onClick={onAbrir}>
              Registrar recebimento
            </Button>
          ) : null}
          {entrou > 0 && !cancelada ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
              <Icon name="circle-check" size={15} color="var(--color-confirmed)" />
              Recebido e lançado
            </span>
          ) : null}
        </div>
      )}
    </Cartao>
  );
}
