import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, TextField } from '../../ds';
import { Select } from '../../components/Campo';
import { Cartao, Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarBRL, formatarCompetencia, pluralizar } from '../../lib/formato';
import { contas } from '../../mocks/financeiro';
import { fila as filaInicial, faltaramSemPedir, pagas as pagasIniciais, type DevolucaoNaFila } from '../../mocks/devolucoes';

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

const HOJE = '11/09/2026';
const COMPETENCIA_ATUAL = '2026-09';

interface Paga {
  id: string;
  nome: string;
  evento: string;
  valor: number;
  pagaEm: string;
  conta: string;
  estorno: string;
}

export function DevolucoesPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [fila, setFila] = useState<readonly DevolucaoNaFila[]>(filaInicial);
  const [pagas, setPagas] = useState<readonly Paga[]>(
    pagasIniciais.map((p) => ({ ...p, id: p.id as string, valor: p.valor as number })),
  );
  const [pagando, setPagando] = useState<string | null>(null);
  const [conta, setConta] = useState(contas[0]!.id as string);
  const [data, setData] = useState(HOJE);
  const [recado, setRecado] = useState<string | null>(null);

  const total = fila.reduce((s, d) => s + d.valor, 0);
  const maisAntiga = [...fila].sort((a, b) => diasEsperando(b.solicitadaEm) - diasEsperando(a.solicitadaEm))[0];

  const pagar = (d: DevolucaoNaFila) => {
    const nomeDaConta = contas.find((c) => (c.id as string) === conta)?.nome ?? '';
    const destino = d.competenciaFechada ? COMPETENCIA_ATUAL : (d.competenciaOriginal as string);
    setFila((lista) => lista.filter((x) => x.id !== d.id));
    setPagas((lista) => [
      {
        id: d.id as string,
        nome: d.nome,
        evento: `${d.evento} · ${d.dataDoEvento.slice(0, 5)}`,
        valor: d.valor,
        pagaEm: data,
        conta: nomeDaConta,
        estorno: `est-${String(d.lancamentoOriginal).replace('lanc-', '')}`,
      },
      ...lista,
    ]);
    setPagando(null);
    setRecado(
      `${formatarBRL(d.valor)} devolvidos a ${d.nome} por ${nomeDaConta}. O estorno entrou na competência ${formatarCompetencia(destino)} e anulou ${d.lancamentoOriginal} — nenhuma despesa nova foi criada.`,
    );
  };

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
        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        <Espelho />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: campo ? 14 : 20,
            }}
          >
            <Numero rotulo="A devolver" valor={formatarBRL(total)} nota={pluralizar(fila.length, 'pedido')} destaque />
            <Numero
              rotulo="Esperando há mais tempo"
              valor={maisAntiga ? pluralizar(diasEsperando(maisAntiga.solicitadaEm), 'dia') : '—'}
              nota={maisAntiga ? maisAntiga.nome : 'fila vazia'}
              cor={maisAntiga && diasEsperando(maisAntiga.solicitadaEm) > 30 ? 'var(--color-attention)' : undefined}
            />
            <Numero rotulo="Devolvidas este ano" valor={String(pagas.length)} nota="já pagas e estornadas" />
          </div>
        </Cartao>

        {fila.length === 0 ? (
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
          fila.map((d) => (
            <CartaoDeDevolucao
              key={d.id}
              devolucao={d}
              campo={campo}
              pagando={pagando === (d.id as string)}
              conta={conta}
              data={data}
              onConta={setConta}
              onData={setData}
              onAbrir={() => {
                setPagando(d.id as string);
                setData(HOJE);
                setRecado(null);
              }}
              onCancelar={() => setPagando(null)}
              onPagar={() => pagar(d)}
            />
          ))
        )}

        <ComoEntraNoResultado campo={campo} />

        <FaltaramSemPedir campo={campo} />

        {pagas.length > 0 ? <JaPagas lista={pagas} campo={campo} /> : null}
      </div>
    </>
  );
}

/** Dias entre uma data `dd/mm/aaaa` e o hoje da tesouraria. */
function diasEsperando(ddmmaaaa: string): number {
  const [d, m, a] = ddmmaaaa.split('/').map(Number);
  const quando = new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  const hoje = new Date(2026, 8, 11);
  return Math.max(0, Math.round((hoje.getTime() - quando.getTime()) / 86_400_000));
}

function Espelho() {
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
      <Icon name="arrow-left-right" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Pedir e pagar são dois atos, de duas pessoas
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
          O Acolhimento cancelou a inscrição e registrou que a pessoa pediu o valor de volta. Esta tela é a outra
          metade, e o Acolhimento não a enxerga — é a fronteira “sem acesso a saída financeira do evento” escrita como
          desenho, não como aviso.
        </p>
      </div>
    </div>
  );
}

function CartaoDeDevolucao({
  devolucao: d,
  campo,
  pagando,
  conta,
  data,
  onConta,
  onData,
  onAbrir,
  onCancelar,
  onPagar,
}: {
  devolucao: DevolucaoNaFila;
  campo: boolean;
  pagando: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onAbrir: () => void;
  onCancelar: () => void;
  onPagar: () => void;
}) {
  const dias = diasEsperando(d.solicitadaEm);

  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
        {d.aContratante ? <StatusBadge tone="royal">Contratante</StatusBadge> : null}
        {dias > 30 ? <StatusBadge tone="attention">{pluralizar(dias, 'dia')} esperando</StatusBadge> : null}
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
          {formatarBRL(d.valor)}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        <Linha rotulo="Evento">
          {d.evento} · {d.dataDoEvento}
        </Linha>
        <Linha rotulo="Pagou em">
          {d.pagouEm} · {d.meioDoPagamento}
        </Linha>
        <Linha rotulo="Pediu em">
          {d.solicitadaEm} · há {pluralizar(dias, 'dia')}
        </Linha>
        <Linha rotulo="Quem registrou">{d.solicitadaPor}</Linha>
      </div>

      <div
        style={{
          borderLeft: '2px solid var(--color-line-gold)',
          paddingLeft: 12,
          font: 'var(--text-body)',
          color: 'var(--text-secondary)',
        }}
      >
        {d.motivo}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'center' }}>
        <Rotulo>Receita original</Rotulo>
        <code style={{ font: 'var(--text-code)' }}>{d.lancamentoOriginal}</code>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          competência {formatarCompetencia(d.competenciaOriginal as string)}
        </span>
        {d.competenciaFechada ? <StatusBadge tone="neutral">período fechado</StatusBadge> : null}
      </div>

      {pagando ? (
        <PainelDePagamento
          devolucao={d}
          campo={campo}
          conta={conta}
          data={data}
          onConta={onConta}
          onData={onData}
          onCancelar={onCancelar}
          onPagar={onPagar}
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Button iconName="arrow-up-right" density={campo ? 'field' : 'office'} onClick={onAbrir}>
            Devolver {formatarBRL(d.valor)}
          </Button>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Valor integral do que foi pago. Não se digita aqui, e não se negocia.
          </span>
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

/**
 * Duas perguntas e só. A conta e a data são o que a Tesouraria sabe; o valor
 * veio do domínio e a categoria não existe, porque devolver não é gastar.
 */
function PainelDePagamento({
  devolucao: d,
  campo,
  conta,
  data,
  onConta,
  onData,
  onCancelar,
  onPagar,
}: {
  devolucao: DevolucaoNaFila;
  campo: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onCancelar: () => void;
  onPagar: () => void;
}) {
  const destino = d.competenciaFechada ? COMPETENCIA_ATUAL : (d.competenciaOriginal as string);

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
      <Rotulo>De onde sai e quando</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Select
          label="Conta"
          value={conta}
          onChange={onConta}
          options={contas.filter((c) => c.ativa).map((c) => ({ value: c.id as string, label: c.nome }))}
        />
        <TextField
          label="Data da saída"
          value={data}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onData(e.target.value)}
          hint="A data de caixa, não a da solicitação."
        />
      </div>

      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Icon name="rotate-ccw" size={15} color="var(--color-royal)" style={{ marginTop: 2 }} />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Vai gerar o <b>estorno de {d.lancamentoOriginal}</b> na competência{' '}
          <b data-numeric>{formatarCompetencia(destino)}</b>
          {d.competenciaFechada
            ? ` — a competência original (${formatarCompetencia(d.competenciaOriginal as string)}) está fechada, e o estorno entra no mês corrente em vez de reabrir um período já prestado.`
            : '.'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button iconName="check" density={campo ? 'field' : 'office'} onClick={onPagar}>
          Confirmar a devolução
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * O ponto contábil da tela, e a divergência que ela levanta contra o Doc 2.
 */
function ComoEntraNoResultado({ campo }: { campo: boolean }) {
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <Rotulo>Devolver não é gastar</Rotulo>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Quando a casa devolve uma contribuição, ela não teve um custo — ela <b>desfaz uma receita que não se
        confirmou</b>. Por isso a devolução entra como estorno do lançamento original, e não como despesa nova: a
        linha “Receita de contribuição” do DRE cai, e nenhuma linha de custo sobe.
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Lançar como despesa fecharia o resultado pelo mesmo número, e é por isso que o erro passa despercebido: as
        duas pontas incham juntas. O DRE passaria a dizer que entraram R$ 210 que nunca ficaram e que a casa gastou
        R$ 210 que nunca gastou — e a leitura de quanto a casa arrecada no ano deixa de ser verdadeira.
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)', maxWidth: '78ch' }}>
        É a mesma família de F2 (pagar fatura é transferência, não despesa), E1 (empréstimo é patrimonial) e A5
        (ressarcir adiantamento não gera despesa nova).
      </span>
    </Cartao>
  );
}

function FaltaramSemPedir({ campo }: { campo: boolean }) {
  const total = faltaramSemPedir.reduce((s, x) => s + x.valor, 0);
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>Faltaram e não pediram</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(faltaramSemPedir.length, 'pessoa')} · {formatarBRL(total)} que continuam com a casa
        </span>
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Não é fila de trabalho: <b>cancelar não devolve</b>. A devolução existe porque alguém pediu, e quem não pediu
        não recebe. Está aqui só para a ausência ser visível em vez de virar dúvida na reunião.
      </span>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {faltaramSemPedir.map((x, i) => (
          <div
            key={x.nome}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '8px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
              opacity: 0.75,
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(x.valor)}
            </span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}

function JaPagas({ lista, campo }: { lista: readonly Paga[]; campo: boolean }) {
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <Rotulo>Já devolvidas</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map((x, i) => (
          <div
            key={x.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '9px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
            }}
          >
            <Icon name="circle-check" size={15} color="var(--color-confirmed)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento} · {x.pagaEm} · {x.conta}
            </span>
            <code style={{ font: 'var(--text-code)' }}>{x.estorno}</code>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(x.valor)}
            </span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}
