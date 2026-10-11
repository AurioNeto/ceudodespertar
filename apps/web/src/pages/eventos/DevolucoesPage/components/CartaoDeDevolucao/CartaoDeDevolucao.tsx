import { Button, Cartao, Rotulo, StatusBadge, type Density } from '@/ds';
import { formatarBRL, formatarCompetencia, pluralizar } from '@/pages/utils/formato';
import type { DevolucaoNaFila } from '../../mocks/devolucoes';
import { diasEsperando } from '../../utils/diasEsperando';
import { Linha } from './components/Linha';
import { PainelDePagamento } from './components/PainelDePagamento';

export interface CartaoDeDevolucaoProps {
  devolucao: DevolucaoNaFila;
  densidade: Density;
  pagando: boolean;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onAbrir: () => void;
  onCancelar: () => void;
  onPagar: () => void;
}

export function CartaoDeDevolucao({
  devolucao: d,
  densidade,
  pagando,
  conta,
  data,
  onConta,
  onData,
  onAbrir,
  onCancelar,
  onPagar,
}: CartaoDeDevolucaoProps) {
  const campo = densidade === 'field';
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
          densidade={densidade}
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
