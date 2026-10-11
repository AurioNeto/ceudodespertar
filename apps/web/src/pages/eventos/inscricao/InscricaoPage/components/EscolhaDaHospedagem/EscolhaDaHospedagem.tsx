import type { Hospedagem, OpcaoDeHospedagem } from '@cdd/contracts';
import { Select, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import type { EventoParaInscricao } from '../../../mocks/eventos';
import { Bloco } from '../Bloco';
import { OpcaoEmLinha } from '../OpcaoEmLinha';

export interface EscolhaDaHospedagemProps {
  evento: EventoParaInscricao;
  hospedagem: Hospedagem;
  opcaoHosp: OpcaoDeHospedagem;
  dias: number;
  custoHospedagem: number;
  onHospedagem: (h: Hospedagem) => void;
  onDias: (n: number) => void;
  densidade: Density;
}

export function EscolhaDaHospedagem({
  evento,
  hospedagem,
  opcaoHosp,
  dias,
  custoHospedagem,
  onHospedagem,
  onDias,
  densidade,
}: EscolhaDaHospedagemProps) {
  return (
    <Bloco titulo="Hospedagem" densidade={densidade}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {evento.hospedagens.map((h) => (
          <OpcaoEmLinha
            key={h.tipo}
            rotulo={h.rotulo}
            nota={h.nota}
            valor={h.valorDiaria > 0 ? `${formatarBRL(h.valorDiaria)} por dia` : 'sem custo'}
            marcada={hospedagem === h.tipo}
            densidade={densidade}
            onEscolher={() => onHospedagem(h.tipo)}
          />
        ))}
      </div>
      {opcaoHosp.valorDiaria > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Select
            label="Quantas diárias"
            value={String(dias)}
            onChange={(v) => onDias(Number(v))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: pluralizar(n, 'diária') }))}
          />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {formatarBRL(custoHospedagem)} de acomodação, <b>à parte da contribuição</b>.
          </span>
        </div>
      ) : null}
    </Bloco>
  );
}
