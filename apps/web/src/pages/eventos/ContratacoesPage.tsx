import { useState } from 'react';
import type { ReactNode } from 'react';
import type { StatusContratacao } from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Select } from '../../components/Campo';
import { Cartao, Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarBRL, pluralizar } from '../../lib/formato';
import { contas } from '../../mocks/financeiro';
import {
  contratacoes as contratacoesIniciais,
  FORMA_EXPLICACAO,
  FORMA_ROTULO,
  munay,
  STATUS_ROTULO,
  type ContratacaoNaTela,
} from '../../mocks/contratacoes';

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

const TOM: Record<StatusContratacao, BadgeTone> = {
  PROPOSTA: 'suggest',
  CONFIRMADA: 'royal',
  REALIZADA: 'confirmed',
  CANCELADA: 'neutral',
};

const HOJE = '11/09/2026';

export function ContratacoesPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [lista, setLista] = useState<readonly ContratacaoNaTela[]>(contratacoesIniciais);
  const [recebendo, setRecebendo] = useState<string | null>(null);
  const [conta, setConta] = useState(contas[0]!.id as string);
  const [data, setData] = useState(HOJE);
  const [recado, setRecado] = useState<string | null>(null);

  const aReceber = lista.filter((c) => c.status === 'CONFIRMADA' && !c.recebidoEm);
  const totalAReceber = aReceber.reduce((s, c) => s + c.valorAcordado, 0);
  const propostas = lista.filter((c) => c.status === 'PROPOSTA');

  const receber = (c: ContratacaoNaTela) => {
    const nomeDaConta = contas.find((x) => (x.id as string) === conta)?.nome ?? '';
    setLista((l) =>
      l.map((x) =>
        x.eventoId === c.eventoId
          ? { ...x, recebidoEm: data, lancamentoReceitaId: `lanc-${String(Date.now()).slice(-4)}` }
          : x,
      ),
    );
    setRecebendo(null);
    setRecado(
      `${formatarBRL(c.valorAcordado)} de ${c.contratante} entraram por ${nomeDaConta}. Virou receita com categoria Cachê de contratação, na unidade Munay, vinculada ao evento — e os cachês dos músicos ficam no mesmo evento, do outro lado.`,
    );
  };

  const confirmar = (c: ContratacaoNaTela) => {
    setLista((l) => l.map((x) => (x.eventoId === c.eventoId ? { ...x, status: 'CONFIRMADA' } : x)));
    setRecado(`Proposta de ${c.contratante} confirmada. Nada de dinheiro se move até o recebimento ser registrado.`);
  };

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
        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

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
              valor={formatarBRL(totalAReceber)}
              nota={pluralizar(aReceber.length, 'contratação confirmada', 'contratações confirmadas')}
              destaque
            />
            <Numero rotulo="Em proposta" valor={String(propostas.length)} nota="ainda não é dinheiro" />
            <Numero
              rotulo="Faturamento no ano"
              valor={formatarBRL(munay.faturamentoNoAno)}
              nota={`de ${formatarBRL(munay.tetoAnual)} do teto do MEI`}
            />
          </div>
        </Cartao>

        <Teto aReceber={totalAReceber} campo={campo} />

        {lista.map((c) => (
          <CartaoDeContratacao
            key={c.eventoId}
            contratacao={c}
            campo={campo}
            recebendo={recebendo === (c.eventoId as string)}
            conta={conta}
            data={data}
            onConta={setConta}
            onData={setData}
            onAbrir={() => {
              setRecebendo(c.eventoId as string);
              setData(HOJE);
              setRecado(null);
            }}
            onCancelarPainel={() => setRecebendo(null)}
            onReceber={() => receber(c)}
            onConfirmar={() => confirmar(c)}
          />
        ))}

        <DoisLadosDaMesmaPalavra campo={campo} />
      </div>
    </>
  );
}

function DeQuemEIsso() {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="flask-conical" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Contratação é ato comercial da Munay, não recepção
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          Negociar cachê com outra instituição não é acolher ninguém — por isso esta tela fica fora do Acolhimento. O
          evento continua sendo evento: tem data, local, equipe e custos apurados por evento, e o resultado se lê do
          mesmo jeito que o de um trabalho da casa.
        </p>
      </div>
    </div>
  );
}

function Teto({ aReceber, campo }: { aReceber: number; campo: boolean }) {
  const atual = munay.faturamentoNoAno / munay.tetoAnual;
  const projetado = (munay.faturamentoNoAno + aReceber) / munay.tetoAnual;

  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', alignItems: 'baseline' }}>
        <Rotulo>Faturamento contra o teto do MEI</Rotulo>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          CNPJ {munay.documento}
        </span>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
          {formatarBRL(munay.faturamentoNoAno + aReceber)} de {formatarBRL(munay.tetoAnual)}
        </span>
      </div>

      <div
        role="img"
        aria-label={`${Math.round(projetado * 100)}% do teto com o que está a receber`}
        style={{ height: 10, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden', display: 'flex' }}
      >
        <div style={{ width: `${Math.min(100, atual * 100)}%`, background: 'var(--color-royal)' }} />
        <div
          style={{
            width: `${Math.min(100 - atual * 100, (projetado - atual) * 100)}%`,
            background: 'var(--color-suggest)',
            opacity: 0.7,
          }}
        />
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Em cheio o que já entrou; em violeta o que está combinado e ainda não. Estourar o teto não é multa, é mudança
        de regime — e a hora de descobrir isso é antes de fechar a próxima contratação, não na declaração.
      </span>
    </Cartao>
  );
}

function CartaoDeContratacao({
  contratacao: c,
  campo,
  recebendo,
  conta,
  data,
  onConta,
  onData,
  onAbrir,
  onCancelarPainel,
  onReceber,
  onConfirmar,
}: {
  contratacao: ContratacaoNaTela;
  campo: boolean;
  recebendo: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onAbrir: () => void;
  onCancelarPainel: () => void;
  onReceber: () => void;
  onConfirmar: () => void;
}) {
  const totalCaches = c.caches.reduce((s, m) => s + m.valor, 0);
  const totalCustos = c.custos.reduce((s, x) => s + x.valor, 0);
  const entrou = c.recebidoEm ? c.valorAcordado : 0;
  const resultado = c.valorAcordado - totalCaches - totalCustos;
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
          campo={campo}
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

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{children}</span>
    </span>
  );
}

function Lado({
  titulo,
  categoria,
  natureza,
  cor,
  total,
  nota,
  children,
}: {
  titulo: string;
  categoria: string;
  natureza: string;
  cor: string;
  total: number;
  nota: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderLeft: `var(--edge-state) solid ${cor}`,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        minWidth: 0,
      }}
    >
      <Rotulo>{titulo}</Rotulo>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 9px', alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-amount)', color: cor }}>
          {formatarBRL(total)}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{natureza}</span>
      </div>
      <code style={{ font: 'var(--text-code)', alignSelf: 'flex-start' }}>{categoria}</code>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      {children}
    </div>
  );
}

function Devolucao({ c }: { c: ContratacaoNaTela }) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '13px 15px',
        display: 'flex',
        gap: 11,
      }}
    >
      <Icon name="undo-2" size={18} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Cancelada com {formatarBRL(c.devolucaoDevida!.valor)} já recebidos
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Cancelar uma contratação que já foi paga gera devolução devida ao contratante, e quem paga é a Tesouraria —
          esta tela não devolve dinheiro. {c.devolucaoDevida!.situacao}.
        </p>
      </div>
    </div>
  );
}

function PainelDeRecebimento({
  contratacao: c,
  campo,
  conta,
  data,
  onConta,
  onData,
  onCancelar,
  onReceber,
}: {
  contratacao: ContratacaoNaTela;
  campo: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onCancelar: () => void;
  onReceber: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: campo ? '14px 15px' : '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <Rotulo>Onde entrou e quando</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Select
          label="Conta"
          value={conta}
          onChange={onConta}
          options={contas.filter((x) => x.ativa).map((x) => ({ value: x.id as string, label: x.nome }))}
        />
        <TextField
          label="Data do recebimento"
          value={data}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onData(e.target.value)}
          hint="A data de caixa."
        />
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Vai gerar receita de {formatarBRL(c.valorAcordado)} com categoria <b>Cachê de contratação</b>, unidade{' '}
        <b>Munay</b>, vinculada a este evento. A categoria e a unidade não se escolhem aqui: vêm da contratação.
      </span>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button iconName="check" density={campo ? 'field' : 'office'} onClick={onReceber}>
          Confirmar o recebimento
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** O nó que o modelo veio desfazer, dito uma vez, no pé da tela. */
function DoisLadosDaMesmaPalavra({ campo }: { campo: boolean }) {
  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <Rotulo>Por que cachê são duas categorias e não uma</Rotulo>
      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: campo ? 11 : 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <code style={{ font: 'var(--text-code)' }}>CACHE_RECEBIDO</code>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>receita da Munay</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            O contratante paga para a Munay tocar.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <code style={{ font: 'var(--text-code)' }}>CACHE_PAGO</code>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>despesa da Munay</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            A Munay paga quem tocou.
          </span>
        </div>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        É a mesma palavra apontando para lados opostos no mesmo evento. Uma categoria só obrigaria a soma a escolher
        um sinal, e a planilha escolhia errado com frequência — era o tipo de erro que não aparece no saldo, só no
        relatório de quanto a Munay realmente ganha.
      </span>
    </Cartao>
  );
}
