import { Cartao, Rotulo, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { aquisicaoExterna, type FeitioNaTela } from '../../mocks/feitio';
import { custoPorLitro } from '../../utils/custoDoFeitio';
import { Barra } from './components/Barra';

export interface ComparacaoProps {
  feitio: FeitioNaTela;
  concluido: boolean;
  total: number;
  densidade: Density;
}

export function Comparacao({ feitio: f, concluido, total, densidade }: ComparacaoProps) {
  const porLitro = concluido ? custoPorLitro(total, f.litrosProduzidos) : null;
  const externo = aquisicaoExterna.custoPorLitro;
  const economia = porLitro !== null ? (externo - porLitro) * (f.litrosProduzidos ?? 0) : null;
  const saiuMaisCaro = economia !== null && economia < 0;
  const comparativo = saiuMaisCaro ? 'mais caro' : 'mais barato';

  return (
    <Cartao density={densidade} style={{ gap: 12 }}>
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
          Fazer saiu <b style={{ color: saiuMaisCaro ? 'var(--color-attention)' : 'var(--color-confirmed)' }}>{formatarBRL(Math.abs(externo - porLitro!))} {comparativo} por
          litro</b> — {formatarBRL(Math.abs(economia))} no total deste feitio. O trabalho de quem ficou três dias na casa está
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
