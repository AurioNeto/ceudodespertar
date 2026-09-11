import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, TextField } from '../../ds';
import { Cartao, Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarBRL, formatarLitros, pluralizar } from '../../lib/formato';
import {
  anteriores,
  aquisicaoExterna,
  custoConfirmado,
  custoTotal,
  emAndamento,
  type FeitioNaTela,
} from '../../mocks/feitio';

/**
 * `S-04` · Feitio — Doc 4 §8 e Doc 2 §4.3.
 *
 * O único lugar do sistema onde evento, custo e estoque se encontram: o feitio
 * é um evento, o que se gasta nele são lançamentos vinculados ao mesmo evento,
 * e o que sai dele é um lote.
 *
 * A razão de existir é econômica, não contábil. Hoje o feitio é despesa
 * dispersa — folha aqui, diesel ali, comida da equipe em outro lugar — e a
 * casa não consegue responder quanto custa o litro que ela produz. Sem esse
 * número não há como comparar com comprar de fora, que é a decisão real por
 * trás de fazer feitio.
 */

const HOJE = '11/09/2026';

export function FeitioPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [feitio, setFeitio] = useState<FeitioNaTela>(emAndamento);
  const [concluindo, setConcluindo] = useState(false);
  const [litros, setLitros] = useState('');
  const [forca, setForca] = useState('Força 2');
  const [dataFim, setDataFim] = useState(HOJE);
  const [recado, setRecado] = useState<string | null>(null);

  const concluido = feitio.dataFim !== null;
  const total = custoTotal(feitio);
  const confirmado = custoConfirmado(feitio);
  const pendentes = feitio.custos.filter((c) => !c.confirmado);

  const litrosNum = Number(litros.replace(',', '.')) || 0;

  const concluir = () => {
    const codigo = `Lote 09/2026`;
    setFeitio((f) => ({
      ...f,
      dataFim,
      litrosProduzidos: litrosNum,
      forca,
      loteProduzido: codigo,
    }));
    setConcluindo(false);
    setRecado(
      `${feitio.nome} concluído: ${formatarLitros(litrosNum)} L de ${forca.toLowerCase()} entraram no estoque como ${codigo}. Custo apurado de ${formatarBRL(total / litrosNum)} por litro.`,
    );
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'S-04' : 'S-04 · Feitio'}
        title="Feitio"
        subtitle={campo ? undefined : 'Onde evento, custo e estoque se encontram · CDD'}
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

        <PorQueApurar />

        <Cartao campo={campo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
              gap: campo ? 14 : 20,
            }}
          >
            <Numero
              rotulo="Gasto até agora"
              valor={formatarBRL(total)}
              nota={`${formatarBRL(feitio.materiaPrima.reduce((s, m) => s + m.custo, 0))} de matéria-prima`}
              destaque
            />
            <Numero
              rotulo={concluido ? 'Custo por litro' : 'Custo por litro'}
              valor={
                concluido && feitio.litrosProduzidos
                  ? formatarBRL(total / feitio.litrosProduzidos)
                  : 'só no fim'
              }
              nota={concluido ? `sobre ${formatarLitros(feitio.litrosProduzidos ?? 0)} L` : 'depende de quanto sair'}
              cor={concluido ? 'var(--color-confirmed)' : 'var(--text-secondary)'}
            />
            <Numero
              rotulo="Comprar de fora sai a"
              valor={`${formatarBRL(aquisicaoExterna.custoPorLitro)}/L`}
              nota={`${aquisicaoExterna.fornecedor} · ${aquisicaoExterna.quando}`}
            />
          </div>
        </Cartao>

        <FeitioEmCurso
          feitio={feitio}
          campo={campo}
          concluido={concluido}
          pendentes={pendentes.length}
          confirmado={confirmado}
          total={total}
        />

        {concluido ? null : (
          <>
            {concluindo ? (
              <PainelDeConclusao
                campo={campo}
                litros={litros}
                forca={forca}
                dataFim={dataFim}
                total={total}
                onLitros={setLitros}
                onForca={setForca}
                onDataFim={setDataFim}
                onCancelar={() => setConcluindo(false)}
                onConcluir={concluir}
              />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11, alignItems: 'center' }}>
                <Button
                  iconName="flask-conical"
                  density={campo ? 'field' : 'office'}
                  onClick={() => {
                    setConcluindo(true);
                    setRecado(null);
                  }}
                >
                  Concluir o feitio
                </Button>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  Concluir cria o lote e fecha o custo. Depois disso o feitio não aceita mais consumo.
                </span>
              </div>
            )}
          </>
        )}

        <Comparacao feitio={feitio} concluido={concluido} total={total} campo={campo} />

        <Anteriores campo={campo} />
      </div>
    </>
  );
}

function PorQueApurar() {
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
          O feitio deixa de ser despesa dispersa
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          Folha, cipó, lenha, diesel, comida de quem ficou três dias na casa — hoje isso entra em lugares diferentes e
          ninguém junta. Aqui tudo se pendura no mesmo evento, e no fim sai um número que a casa nunca teve:{' '}
          <b>quanto custa o litro que ela produz</b>. É esse número que decide se vale mais fazer ou comprar.
        </p>
      </div>
    </div>
  );
}

function FeitioEmCurso({
  feitio: f,
  campo,
  concluido,
  pendentes,
  confirmado,
  total,
}: {
  feitio: FeitioNaTela;
  campo: boolean;
  concluido: boolean;
  pendentes: number;
  confirmado: number;
  total: number;
}) {
  const totalMateria = f.materiaPrima.reduce((s, m) => s + m.custo, 0);
  const totalCustos = f.custos.reduce((s, c) => s + c.valor, 0);

  return (
    <Cartao campo={campo} style={{ gap: 15 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{f.nome}</span>
        <StatusBadge tone={concluido ? 'confirmed' : 'royal'}>
          {concluido ? 'Concluído' : 'Em andamento'}
        </StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {f.dataInicio}
          {f.dataFim ? ` a ${f.dataFim}` : ' · ainda na panela'} · {f.local}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px', alignItems: 'center' }}>
        <Rotulo>Quem está fazendo</Rotulo>
        {f.participantes.map((p) => (
          <span
            key={p}
            style={{
              font: 'var(--text-small)',
              background: 'var(--bg-sunken)',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-pill)',
              padding: '2px 10px',
              color: 'var(--text-secondary)',
            }}
          >
            {p}
          </span>
        ))}
      </div>

      {f.loteProduzido ? (
        <div
          style={{
            background: 'var(--color-confirmed-soft)',
            border: '1px solid var(--color-confirmed-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 12px',
            alignItems: 'baseline',
          }}
        >
          <Icon name="circle-check" size={17} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{f.loteProduzido}</span>
          <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
            {formatarLitros(f.litrosProduzidos ?? 0)} L
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{f.forca}</span>
          <span style={{ flex: 1 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Um feitio gera exatamente um lote.
          </span>
        </div>
      ) : null}

      <Secao
        titulo="Matéria-prima"
        total={totalMateria}
        nota="Saída de estoque, no mesmo evento — a folha que entrou na panela não está mais no galpão."
      >
        {f.materiaPrima.map((m) => (
          <div key={m.itemId} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 110 }}>
              {m.nome}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 70 }}>
              {m.quantidade} {m.unidade}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 170 }}>
              {m.origem}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>
              {formatarBRL(m.custo)}
            </span>
          </div>
        ))}
      </Secao>

      <Secao
        titulo="O resto do custo"
        total={totalCustos}
        nota="Lançamentos vinculados a este evento. Eles existem no financeiro de qualquer jeito; o que muda é conseguir somá-los."
      >
        {f.custos.map((c) => (
          <div key={c.lancamentoId} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', alignItems: 'baseline' }}>
            <Icon
              name={c.confirmado ? 'circle-check' : 'circle-alert'}
              size={13}
              color={c.confirmado ? 'var(--color-confirmed)' : 'var(--color-pending)'}
            />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {c.descricao}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 140 }}>
              {c.categoria}
            </span>
            <code style={{ font: 'var(--text-code)' }}>{c.lancamentoId}</code>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>
              {formatarBRL(c.valor)}
            </span>
          </div>
        ))}
      </Secao>

      {pendentes > 0 ? (
        <div
          style={{
            background: 'var(--color-pending-soft)',
            border: '1px solid var(--color-pending-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            gap: 11,
            alignItems: 'flex-start',
          }}
        >
          <Icon name="circle-alert" size={17} color="var(--color-pending)" style={{ marginTop: 2 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
            {pluralizar(pendentes, 'lançamento ainda na fila de verificação', 'lançamentos ainda na fila de verificação')}
            . O custo por litro que sair daqui é <b>parcial</b>: {formatarBRL(confirmado)} confirmados de{' '}
            {formatarBRL(total)} registrados. Conferir a fila antes de concluir fecha a conta de verdade.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}

function Secao({
  titulo,
  total,
  nota,
  children,
}: {
  titulo: string;
  total: number;
  nota: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
        <Rotulo>{titulo}</Rotulo>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
          {formatarBRL(total)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>{nota}</span>
    </div>
  );
}

function PainelDeConclusao({
  campo,
  litros,
  forca,
  dataFim,
  total,
  onLitros,
  onForca,
  onDataFim,
  onCancelar,
  onConcluir,
}: {
  campo: boolean;
  litros: string;
  forca: string;
  dataFim: string;
  total: number;
  onLitros: (v: string) => void;
  onForca: (v: string) => void;
  onDataFim: (v: string) => void;
  onCancelar: () => void;
  onConcluir: () => void;
}) {
  const litrosNum = Number(litros.replace(',', '.')) || 0;
  const porLitro = litrosNum > 0 ? total / litrosNum : null;

  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      <Rotulo>Quanto saiu da panela</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        <TextField
          label="Litros produzidos"
          placeholder="0,0"
          inputMode="decimal"
          value={litros}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onLitros(e.target.value)}
        />
        <TextField
          label="Força"
          value={forca}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onForca(e.target.value)}
          hint="Vai junto com o lote, para a vida toda."
        />
        <TextField
          label="Data de encerramento"
          value={dataFim}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onDataFim(e.target.value)}
        />
      </div>

      {porLitro !== null ? (
        <div
          style={{
            background: 'var(--bg-sunken)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px 12px',
            alignItems: 'baseline',
          }}
        >
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
            {formatarBRL(total)} em {formatarLitros(litrosNum)} L
          </span>
          <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
            {formatarBRL(porLitro)}/L
          </span>
        </div>
      ) : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Concluir gera <b>um lote</b> — nem zero nem dois — com a força que você escrever, e fecha o feitio para novos
        consumos. A partir daqui a folha que faltou entra no próximo, não neste.
      </span>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button
          iconName="check"
          density={campo ? 'field' : 'office'}
          disabled={litrosNum <= 0 || !forca.trim() || !dataFim.trim()}
          blockedReason={
            litrosNum <= 0
              ? 'Quantos litros saíram? Sem isso não há lote nem custo por litro.'
              : !forca.trim()
                ? 'A força vai no lote e acompanha o sacramento até o fim.'
                : !dataFim.trim()
                  ? 'Concluir exige a data de encerramento.'
                  : undefined
          }
          onClick={onConcluir}
        >
          Concluir e criar o lote
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Cartao>
  );
}

function Comparacao({
  feitio: f,
  concluido,
  total,
  campo,
}: {
  feitio: FeitioNaTela;
  concluido: boolean;
  total: number;
  campo: boolean;
}) {
  const porLitro = concluido && f.litrosProduzidos ? total / f.litrosProduzidos : null;
  const externo = aquisicaoExterna.custoPorLitro;
  const economia = porLitro !== null ? (externo - porLitro) * (f.litrosProduzidos ?? 0) : null;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>Fazer ou comprar</Rotulo>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Barra
          rotulo={concluido ? `${f.nome} · feito em casa` : 'Feitio em andamento'}
          valor={porLitro}
          maximo={externo}
          cor="var(--color-royal)"
          vazio="fecha quando o feitio concluir"
        />
        <Barra
          rotulo={`Comprar de ${aquisicaoExterna.fornecedor}`}
          valor={externo}
          maximo={externo}
          cor="var(--color-neutral)"
          vazio=""
        />
      </div>

      {economia !== null ? (
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          Fazer saiu <b style={{ color: 'var(--color-confirmed)' }}>{formatarBRL(externo - porLitro!)} mais barato por
          litro</b> — {formatarBRL(economia)} no total deste feitio. O trabalho de quem ficou três dias na casa está
          contado aqui como ajuda de custo; o que não está, e nunca vai estar, é o que o feitio significa.
        </span>
      ) : (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          A comparação fecha quando o feitio concluir. Antes disso o custo existe e os litros não, e dividir um pelo
          outro daria um número inventado.
        </span>
      )}
    </Cartao>
  );
}

function Barra({
  rotulo,
  valor,
  maximo,
  cor,
  vazio,
}: {
  rotulo: string;
  valor: number | null;
  maximo: number;
  cor: string;
  vazio: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', alignItems: 'baseline' }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)', flex: 1, minWidth: 180 }}>
          {rotulo}
        </span>
        <span data-numeric style={{ font: 'var(--text-amount)', color: valor === null ? 'var(--text-meta)' : cor }}>
          {valor === null ? vazio : `${formatarBRL(valor)}/L`}
        </span>
      </div>
      <div style={{ height: 9, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}>
        <div
          style={{
            width: valor === null ? '0%' : `${Math.min(100, (valor / maximo) * 100)}%`,
            height: '100%',
            background: cor,
            transition: 'width var(--motion)',
          }}
        />
      </div>
    </div>
  );
}

function Anteriores({ campo }: { campo: boolean }) {
  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <Rotulo>Feitios anteriores</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {anteriores.map((f, i) => {
          const t = custoTotal(f);
          const porLitro = f.litrosProduzidos ? t / f.litrosProduzidos : 0;
          return (
            <div
              key={f.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 12px',
                alignItems: 'baseline',
                padding: '10px 0',
                borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
              }}
            >
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
                {f.nome}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', minWidth: 110 }}>
                {f.loteProduzido}
              </span>
              <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 62 }}>
                {formatarLitros(f.litrosProduzidos ?? 0)} L
              </span>
              <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 86 }}>
                {formatarBRL(t)}
              </span>
              <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
                {formatarBRL(porLitro)}/L
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        A série importa mais que qualquer valor isolado: um feitio caro pode ser uma colheita ruim, e dois seguidos já
        são uma conversa sobre onde a casa compra a folha.
      </span>
    </Cartao>
  );
}
