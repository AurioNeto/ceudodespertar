import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { AmountDisplay, Button, Cartao, Rotulo, TextField, type Density } from '@/ds';
import { lerValorDigitado } from '@/lib/numero';
import { formatarBRL, formatarDinheiro, pluralizar } from '@/pages/utils/formato';
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
  const social = eventoDoLink.contribuicoes[0]!.valor;
  const prospero = eventoDoLink.contribuicoes[2]!.valor;
  const digitado = Math.round(lerValorDigitado(props.valor) * 100) || 0;

  return (
    <Passos
      titulo="Sua participação"
      recado="Contribuição, onde você dorme e o que a casa precisa saber para cuidar de você."
    >
      <Cartao campo={campo} style={{ gap: 12 }}>
        <Rotulo>Contribuição</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '60ch' }}>
          Três valores sugeridos pelos padrinhos, referentes à participação na cerimônia. <b>São sugestão, não
          preço.</b> Escolha o que couber na sua condição — e, se puder e quiser contribuir mais, também pode.
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          {eventoDoLink.contribuicoes.map((c) => {
            const marcado = props.nivel === c.nivel;
            return (
              <button
                key={c.nivel}
                type="button"
                aria-pressed={marcado}
                onClick={() => props.onNivel(c.nivel, formatarDinheiro(c.valor))}
                style={{
                  textAlign: 'left',
                  padding: '13px 15px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${marcado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                  background: marcado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  minHeight: campo ? 'var(--target-field)' : undefined,
                }}
              >
                <span style={{ font: 'var(--text-body-strong)', color: marcado ? 'var(--color-royal-ink)' : 'var(--text-primary)' }}>
                  {c.rotulo}
                </span>
                <AmountDisplay value={c.valor / 100} size="sm" style={{ color: 'var(--color-royal-deep)' }} />
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.explicacao}</span>
              </button>
            );
          })}
        </div>

        <TextField
          label="Quanto você vai contribuir"
          value={props.valor}
          placeholder="0,00"
          inputMode="decimal"
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onValor(e.target.value)}
          hint="Pode digitar outro valor. Ninguém vai te cobrar explicação."
        />

        {digitado > 0 && digitado < social ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Abaixo do valor social, e tudo bem. Se quiser conversar sobre isso, a recepção está no WhatsApp.
          </span>
        ) : null}
        {digitado > prospero ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
            Obrigado — isso é contribuição voluntária acima do sugerido.
          </span>
        ) : null}
      </Cartao>

      <Cartao campo={campo} style={{ gap: 11 }}>
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

      <Cartao campo={campo} style={{ gap: 11 }}>
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

      <Cartao campo={campo} style={{ gap: 12 }}>
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
