import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { Button, Cartao, Icon, Rotulo, TextField, type Density } from '@/ds';
import { formatarBRL, formatarDinheiro, pluralizar } from '@/pages/utils/formato';
import { eventoDoLink } from '../../../mocks/linkDaCerimonia';
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
  const digitado = Math.round(Number(props.valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;

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
                <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
                  {formatarBRL(c.valor)}
                </span>
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
          {eventoDoLink.hospedagens.map((h) => {
            const marcada = props.hospedagem === h.tipo;
            return (
              <button
                key={h.tipo}
                type="button"
                aria-pressed={marcada}
                aria-label={h.rotulo}
                onClick={() => props.onHospedagem(h.tipo)}
                style={{
                  textAlign: 'left',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                  background: marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 11,
                  alignItems: 'center',
                  minHeight: campo ? 'var(--target-field)' : undefined,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                    background: marcada ? 'var(--color-royal)' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{h.rotulo}</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{h.nota}</span>
                </span>
                <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {h.valorDiaria > 0 ? `${formatarBRL(h.valorDiaria)} / dia` : 'sem custo'}
                </span>
              </button>
            );
          })}
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
            <Button variant="ghost" onClick={() => props.onRestricoes('Nenhuma')}>
              Não tenho nenhuma
            </Button>
          </span>
        )}
      </Cartao>

      <Cartao campo={campo} style={{ gap: 12 }}>
        {props.semValor ? (
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--text-secondary)' }}>A combinar</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
              {formatarBRL(props.total)}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(props.contribuicao)} de contribuição
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
