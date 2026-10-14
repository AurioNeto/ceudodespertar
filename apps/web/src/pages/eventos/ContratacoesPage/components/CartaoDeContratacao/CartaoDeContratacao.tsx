import { AmountDisplay, Button, Cartao, Icon, Leitura, StatusBadge, type Density } from '@/ds';
import { PainelDeContaEData } from '@/pages/eventos/components/PainelDeContaEData';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { ID_DO_CAMPO_DA_DATA_DO_RECEBIMENTO } from '../../constantes';
import type { ContratacaoNaTela } from '../../mocks/contratacoes';
import { Devolucao } from './components/Devolucao';
import { Lado } from './components/Lado';
import { ListaDeCaches } from './components/ListaDeCaches';
import { OutrosCustos } from './components/OutrosCustos';
import { ResultadoDoEvento } from './components/ResultadoDoEvento';
import { FORMA_EXPLICACAO, FORMA_ROTULO, STATUS_ROTULO, TOM } from './constantes';
import { resultadoDaContratacao } from './utils/resultadoDaContratacao';

export interface CartaoDeContratacaoProps {
  contratacao: ContratacaoNaTela;
  densidade: Density;
  recebendo: boolean;
  conta: string;
  data: string;
  erroDaData: string | undefined;
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
  erroDaData,
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
    <Cartao density={densidade} style={{ gap: 14, opacity: cancelada ? 0.9 : 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{c.contratante}</span>
        <StatusBadge tone={TOM[c.status]}>{STATUS_ROTULO[c.status]}</StatusBadge>
        {c.documento ? (
          <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            CNPJ {c.documento}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
        <AmountDisplay value={c.valorAcordado / 100} size="lg" style={{ color: 'var(--color-royal-deep)' }} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        <Leitura rotulo="Evento" valor={`${c.evento} · ${c.data}`} tamanho="pequeno" />
        <Leitura rotulo="Onde" valor={c.local} tamanho="pequeno" />
        <Leitura
          rotulo="Forma de pagamento"
          valor={`${FORMA_ROTULO[c.formaPagamento]} · ${FORMA_EXPLICACAO[c.formaPagamento]}`}
          tamanho="pequeno"
        />
        {c.dataPrevistaPagamento ? (
          <Leitura rotulo="Previsto para" valor={c.dataPrevistaPagamento} tamanho="pequeno" />
        ) : null}
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
            {c.caches.length > 0 ? <ListaDeCaches caches={c.caches} /> : null}
          </Lado>
        </div>
      )}

      {c.custos.length > 0 ? <OutrosCustos custos={c.custos} /> : null}

      {cancelada ? null : (
        <ResultadoDoEvento
          valorAcordado={c.valorAcordado}
          totalCaches={totalCaches}
          totalCustos={totalCustos}
          resultado={resultado}
        />
      )}

      {c.devolucaoDevida ? <Devolucao c={c} /> : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.observacoes}</span>

      {recebendo ? (
        <PainelDeContaEData
          titulo="Onde entrou e quando"
          densidade={densidade}
          conta={conta}
          data={data}
          idDaData={ID_DO_CAMPO_DA_DATA_DO_RECEBIMENTO}
          rotuloDaData="Data do recebimento"
          dicaDaData="A data de caixa."
          erroDaData={erroDaData}
          rotuloDeConfirmar="Confirmar o recebimento"
          onConta={onConta}
          onData={onData}
          onCancelar={onCancelarPainel}
          onConfirmar={onReceber}
        >
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
            Vai gerar receita de {formatarBRL(c.valorAcordado)} com categoria <b>Cachê de contratação</b>, unidade{' '}
            <b>Munay</b>, vinculada a este evento. A categoria e a unidade não se escolhem aqui: vêm da contratação.
          </span>
        </PainelDeContaEData>
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
