import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { Button, Cartao, Rotulo, TextField, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { Contribuicao } from '../../../components/Contribuicao';
import { OpcaoMarcavel } from '../../../components/OpcaoMarcavel';
import { eventoDoLink } from '../../../mocks/linkDaCerimonia';
import { totalComContribuicaoACombinar } from '../../../utils/totalComContribuicaoACombinar';
import { Passos } from '../Passos';

export interface ParticipacaoProps {
  densidade: Density;
  nivel: NivelDeContribuicao | null;
  valor: string;
  onNivel: (n: NivelDeContribuicao, v: string) => void;
  onValor: (v: string) => void;
  hospedagem: Hospedagem;
  onHospedagem: (h: Hospedagem) => void;
  dias: number;
  onDias: (n: number) => void;
  refeicoes: readonly Refeicao[];
  onRefeicoes: (r: readonly Refeicao[]) => void;
  emergencia: string;
  onEmergencia: (v: string) => void;
  restricoes: string;
  onRestricoes: (v: string) => void;
  total: number;
  semValor: boolean;
  contribuicao: number;
  custoHospedagem: number;
  custoRefeicoes: number;
  faltando: readonly string[];
  onEnviar: () => void;
}

export function Participacao(props: ParticipacaoProps) {
  const campo = props.densidade === 'field';

  return (
    <Passos
      titulo="Sua participação"
      recado="Contribuição, onde você dorme e o que a casa precisa saber para cuidar de você."
    >
      <Contribuicao
        evento={eventoDoLink}
        quemInscreve="pessoa"
        isento={false}
        nivel={props.nivel}
        valor={props.valor}
        onNivel={props.onNivel}
        onValor={props.onValor}
        densidade={props.densidade}
      />

      <Cartao density={props.densidade} style={{ gap: 11 }}>
        <Rotulo>Onde você vai dormir</Rotulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {eventoDoLink.hospedagens.map((h) => (
            <OpcaoMarcavel
              key={h.tipo}
              rotulo={h.rotulo}
              nota={h.nota}
              valor={h.valorDiaria > 0 ? `${formatarBRL(h.valorDiaria)} / dia` : 'sem custo'}
              marcada={props.hospedagem === h.tipo}
              densidade={props.densidade}
              onEscolher={() => props.onHospedagem(h.tipo)}
            />
          ))}
        </div>
        {props.custoHospedagem > 0 ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {pluralizar(props.dias, 'diária')} · {formatarBRL(props.custoHospedagem)} de acomodação,{' '}
            <b>à parte da contribuição</b>.
          </span>
        ) : null}
      </Cartao>

      <Cartao density={props.densidade} style={{ gap: 11 }}>
        <Rotulo>Para a casa cuidar de você</Rotulo>
        <TextField
          label="Contato de emergência"
          placeholder="Nome e telefone de quem a casa liga"
          value={props.emergencia}
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onEmergencia(e.target.value)}
        />
        <TextField
          label="Restrições alimentares"
          placeholder="O que você não come, ou “nenhuma”"
          value={props.restricoes}
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onRestricoes(e.target.value)}
        />
        {props.restricoes.trim() ? null : (
          <span>
            <Button variant="ghost" density={campo ? 'field' : 'office'} onClick={() => props.onRestricoes('Nenhuma')}>
              Não tenho nenhuma
            </Button>
          </span>
        )}
      </Cartao>

      <Cartao density={props.densidade} style={{ gap: 12 }}>
        {props.semValor && props.total === 0 ? (
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--text-secondary)' }}>A combinar</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
              {props.semValor ? totalComContribuicaoACombinar(props.total) : formatarBRL(props.total)}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {props.semValor ? 'Contribuição a combinar' : `${formatarBRL(props.contribuicao)} de contribuição`}
              {props.custoHospedagem > 0 ? ` · ${formatarBRL(props.custoHospedagem)} de acomodação` : ''}
              {props.custoRefeicoes > 0 ? ` · ${formatarBRL(props.custoRefeicoes)} de alimentação` : ''}
            </span>
          </div>
        )}
        <Button
          fullWidth
          density={campo ? 'field' : 'office'}
          iconName="check-check"
          disabled={props.faltando.length > 0}
          blockedReason={props.faltando.length > 0 ? `Falta preencher: ${props.faltando.join(' e ')}.` : undefined}
          onClick={props.onEnviar}
        >
          Enviar minha inscrição
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          Você não paga por aqui. O pagamento é combinado com a recepção.
        </span>
      </Cartao>
    </Passos>
  );
}
