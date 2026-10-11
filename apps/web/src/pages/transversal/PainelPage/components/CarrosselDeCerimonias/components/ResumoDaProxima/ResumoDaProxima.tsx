import { Icon } from '@/ds';
import { proximaCerimonia } from '../../../../mocks/cerimonias';
import { formatarBRL, formatarDiaMes, pluralizar } from '@/pages/utils/formato';
import { CartazSlot } from '@/pages/components/CartazSlot';
import { rotuloLabel } from '../../../../constantes';
import { ItemDeMeta } from '../ItemDeMeta';
import { BlocoDoResumo } from './components/BlocoDoResumo';

export function ResumoDaProxima() {
  const c = proximaCerimonia;
  const vagasAbertas = c.capacidade - c.inscritos;

  return (
    <div style={{ padding: '18px 20px 22px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <CartazSlot largura={132} altura={178} />

      <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rotuloLabel}>Próxima cerimônia · em {pluralizar(c.emDias, 'dia')}</div>
          <h2
            style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}
          >
            {formatarDiaMes(c.data)} · {c.nome}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 2 }}>
            <ItemDeMeta icone="calendar-days">{c.horario}</ItemDeMeta>
            <ItemDeMeta icone="user-round">{c.dirigente}</ItemDeMeta>
            <ItemDeMeta icone="landmark">
              hospedagem {c.leitosOcupados} / {c.leitos} leitos
            </ItemDeMeta>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 16 }}>
          <BlocoDoResumo
            icone="users"
            corDoIcone="var(--color-royal-deep)"
            rotulo="Inscritos"
            numero={c.inscritos}
            corDoNumero="var(--color-royal-deep)"
            detalhe={`de ${c.capacidade} vagas — ${vagasAbertas} ainda abertas`}
            destacado
          />
          <BlocoDoResumo
            icone="receipt-text"
            corDoIcone="var(--color-pending)"
            rotulo="Sem pagamento"
            numero={c.semPagamento}
            corDoNumero="var(--color-pending)"
            detalhe={`${formatarBRL(c.aReceber)} a receber até ${formatarDiaMes(c.aReceberAte)}`}
          />
          <BlocoDoResumo
            icone="log-in"
            corDoIcone="var(--color-royal)"
            rotulo="Primeira vez"
            numero={c.primeiraVezNaCasa}
            corDoNumero="var(--color-royal-deep)"
            detalhe={
              <>
                na casa — <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.primeiraVezNaAyahuasca}</span>{' '}
                deles nunca tomaram ayahuasca
              </>
            }
          />
          <BlocoDoResumo
            icone="message-circle-question"
            corDoIcone="var(--color-pending)"
            rotulo="Anamnese"
            numero={c.anamnesePendente}
            corDoNumero="var(--color-pending)"
            detalhe={`ainda não responderam — ${c.anamneseEntregue} de ${c.inscritos} entregues`}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '14px 16px',
            background: 'var(--color-attention-soft)',
            border: '1px solid var(--color-attention-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
            <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {pluralizar(c.pontosDeAtencao.length, 'ponto')} de atenção em medicação ou saúde
            </span>
          </div>
          {c.pontosDeAtencao.map((a) => (
            <div
              key={a.nome}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'baseline',
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{a.nome}</span>
              <span>{a.nota}</span>
            </div>
          ))}
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Quem cuida da recepção precisa falar com essas {c.pontosDeAtencao.length} pessoas antes da abertura.
          </span>
        </div>
      </div>
    </div>
  );
}
