import { ScreenHeader } from '@/ds';
import { competenciaAtual } from '@/pages/mocks/relogio';
import { formatarCompetencia } from '@/pages/utils/formato';
import { GraficoEstoque } from './components/GraficoEstoque';
import { CartaoDeSaldo } from './components/CartaoDeSaldo';
import { MovimentoDoMes } from './components/MovimentoDoMes';
import { AvisoDeLote } from './components/AvisoDeLote';
import { CarrosselDeCerimonias } from './components/CarrosselDeCerimonias';

export function PainelPage() {
  return (
    <>
      <ScreenHeader
        code="T-02 · Painel"
        title="Painel"
        subtitle={`Competência ${formatarCompetencia(competenciaAtual)} · CDD — o que o dinheiro e as cerimônias estão fazendo agora.`}
      />

      <div
        style={{
          padding: '22px 24px 44px',
          maxWidth: 1220,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
          <CartaoDeSaldo />

          <MovimentoDoMes />
        </div>

        <AvisoDeLote />

        <CarrosselDeCerimonias />

        <GraficoEstoque />
      </div>
    </>
  );
}
