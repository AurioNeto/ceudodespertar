import { Button, Icon, Interruptor } from '@/ds';
import type { Trabalho } from '../../../../tipos';
import { Bloco } from '../Bloco';
import { MESES_CURTOS, ORIGENS_DE_MARCACAO } from './constantes';

export interface ListaDePreparoProps {
  trabalho: Trabalho;
  feitos: Readonly<Record<string, boolean>>;
  webhookAtivo: boolean;
  onAlternarTarefa: (indice: number) => void;
  onAlternarWebhook: () => void;
  onAviso: (texto: string) => void;
}

export function ListaDePreparo({
  trabalho: ev,
  feitos,
  webhookAtivo,
  onAlternarTarefa,
  onAlternarWebhook,
  onAviso,
}: ListaDePreparoProps) {
  const prontas = ev.preparo.filter((_, i) => feitos[`${ev.id}:${i}`]).length;
  const linkDoPreparo = `cdd.app/preparo/${ev.id}-${String(ev.dia).padStart(2, '0')}${MESES_CURTOS[ev.mes - 1]}`;

  return (
    <Bloco
      titulo="Lista de preparo"
      nota={ev.preparo.length ? `${prontas} de ${ev.preparo.length} prontos` : 'sem tarefas'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ev.preparo.map((t, i) => {
          const feita = !!feitos[`${ev.id}:${i}`];
          return (
            <label
              key={t.titulo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                background: feita ? 'var(--color-confirmed-soft)' : 'var(--bg-card)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={feita}
                onChange={() => onAlternarTarefa(i)}
                style={{ width: 17, height: 17, cursor: 'pointer' }}
              />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    font: 'var(--text-body)',
                    color: 'var(--text-primary)',
                    textDecoration: feita ? 'line-through' : 'none',
                  }}
                >
                  {t.titulo}
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  {t.responsavel}
                  {feita ? ` · ${ORIGENS_DE_MARCACAO[i % ORIGENS_DE_MARCACAO.length]}` : ''}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          borderTop: 'var(--border-hairline)',
          paddingTop: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 0 }}>
          <Icon name="link" size={16} color="var(--color-royal)" />
          <code
            style={{
              font: 'var(--text-code)',
              color: 'var(--color-royal-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {linkDoPreparo}
          </code>
          <Button
            variant="quiet"
            iconName="copy"
            onClick={() => onAviso('Link do preparo copiado. Quem abrir entra com o próprio login para marcar as tarefas.')}
          >
            Copiar
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'right' }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Webhook</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {webhookAtivo ? 'POST /preparo/{id}/tarefas · última atualização hoje, 14:02' : 'desligado'}
            </span>
          </span>
          <Interruptor
            ligado={webhookAtivo}
            onAlternar={onAlternarWebhook}
            rotuloAcessivel="Atualização do preparo por webhook"
          />
        </div>
      </div>
    </Bloco>
  );
}
