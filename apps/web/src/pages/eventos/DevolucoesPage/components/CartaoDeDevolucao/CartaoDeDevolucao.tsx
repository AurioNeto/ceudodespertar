import { AmountDisplay, Button, Cartao, Icon, Leitura, Rotulo, StatusBadge, TextField, type Density } from '@/ds';
import { PainelDeContaEData } from '@/pages/eventos/components/PainelDeContaEData';
import { formatarBRL, formatarCompetencia, pluralizar } from '@/pages/utils/formato';
import { ID_DO_CAMPO_DA_DATA_DA_SAIDA } from '../../constantes';
import type { DevolucaoNaFila } from '../../mocks/devolucoes';
import { competenciaDaSaida } from '../../utils/competenciaDaSaida';
import { diasEsperando } from '../../utils/diasEsperando';

export interface CartaoDeDevolucaoProps {
  devolucao: DevolucaoNaFila;
  densidade: Density;
  pagando: boolean;
  conta: string;
  data: string;
  erroDaData: string | undefined;
  motivo: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onMotivo: (v: string) => void;
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
  erroDaData,
  motivo,
  onConta,
  onData,
  onMotivo,
  onAbrir,
  onCancelar,
  onPagar,
}: CartaoDeDevolucaoProps) {
  const campo = densidade === 'field';
  const dias = diasEsperando(d.solicitadaEm);
  const destino = competenciaDaSaida(d);
  const faltaMotivo = d.competenciaFechada && !motivo.trim();

  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
        {d.aContratante ? <StatusBadge tone="royal">Contratante</StatusBadge> : null}
        {dias > 30 ? <StatusBadge tone="attention">{pluralizar(dias, 'dia')} esperando</StatusBadge> : null}
        <span style={{ flex: 1 }} />
        <AmountDisplay value={d.valor / 100} size="lg" style={{ color: 'var(--color-royal-deep)' }} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        <Leitura rotulo="Evento" valor={`${d.evento} · ${d.dataDoEvento}`} tamanho="pequeno" />
        <Leitura rotulo="Pagou em" valor={`${d.pagouEm} · ${d.meioDoPagamento}`} tamanho="pequeno" />
        <Leitura rotulo="Pediu em" valor={`${d.solicitadaEm} · há ${pluralizar(dias, 'dia')}`} tamanho="pequeno" />
        <Leitura rotulo="Quem registrou" valor={d.solicitadaPor} tamanho="pequeno" />
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
        <PainelDeContaEData
          titulo="De onde sai e quando"
          densidade={densidade}
          conta={conta}
          data={data}
          idDaData={ID_DO_CAMPO_DA_DATA_DA_SAIDA}
          rotuloDaData="Data da saída"
          dicaDaData="A data de caixa, não a da solicitação."
          erroDaData={erroDaData}
          rotuloDeConfirmar="Confirmar a devolução"
          bloqueioDeConfirmar={
            faltaMotivo ? `Registre o motivo para lançar em ${formatarCompetencia(destino)}.` : undefined
          }
          onConta={onConta}
          onData={onData}
          onCancelar={onCancelar}
          onConfirmar={onPagar}
        >
          {d.competenciaFechada ? (
            <TextField
              label="Motivo"
              value={motivo}
              density={campo ? 'field' : 'office'}
              onChange={(e) => onMotivo(e.target.value)}
              hint={`Por que a saída entra em ${formatarCompetencia(destino)} e não em ${formatarCompetencia(d.competenciaOriginal as string)}.`}
            />
          ) : null}

          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Icon name="arrow-up-right" size={15} color="var(--color-royal)" style={{ marginTop: 2 }} />
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Vai gerar um <b>lançamento de saída</b> vinculado ao evento {d.evento}, na competência{' '}
              <b data-numeric>{formatarCompetencia(destino)}</b>
              {d.competenciaFechada
                ? ` — a competência original (${formatarCompetencia(d.competenciaOriginal as string)}) está fechada e não recebe lançamento sem reabertura; a saída só entra no mês corrente com a decisão registrada no motivo.`
                : '.'}
            </span>
          </div>
        </PainelDeContaEData>
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
