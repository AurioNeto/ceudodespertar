import { ultimaCerimonia } from '../../../../mocks/cerimonias';
import { formatarBRL, formatarDiaMes, formatarLitros, pluralizar } from '@/pages/utils/formato';
import { CartazSlot } from '@/pages/components/CartazSlot';
import { rotuloLabel } from '../../../../constantes';
import { ItemDeMeta } from '../ItemDeMeta';
import { ValorDaUltima } from './components/ValorDaUltima';

export function ResumoDaUltima() {
  const u = ultimaCerimonia;

  return (
    <div style={{ padding: '18px 20px 22px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <CartazSlot largura={132} altura={178} />

      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rotuloLabel}>Última cerimônia</div>
          <h2
            style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}
          >
            {formatarDiaMes(u.data)} · {u.nome}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 2 }}>
            <ItemDeMeta icone="users">{pluralizar(u.participantes, 'participante')}</ItemDeMeta>
            <ItemDeMeta icone="check-check" cor="var(--color-confirmed)">
              contas fechadas em {formatarDiaMes(u.contasFechadasEm)}
            </ItemDeMeta>
            <ItemDeMeta icone="user-round">{u.dirigente}</ItemDeMeta>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 18 }}>
          <ValorDaUltima rotulo="Contribuições" valor={u.contribuicoes} cor="var(--color-confirmed)" />
          <ValorDaUltima rotulo="Custos" valor={u.custos} cor="var(--color-attention)" divisor />
          <ValorDaUltima rotulo="Resultado" valor={u.resultado} cor="var(--color-royal-deep)" sinal divisor />
        </div>

        <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Média de {formatarBRL(u.mediaPorParticipante)} por participante — {formatarLitros(u.litrosServidos)} L de
          ayahuasca servidos, dentro do consumo habitual.
        </div>
      </div>
    </div>
  );
}
