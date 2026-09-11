import type { Pergunta, PerguntaPendente } from '@cdd/contracts';
import { Icon, StatusBadge } from '../ds';
import { TextField } from '../ds';
import { Cartao } from './Blocos';

/**
 * As peças de responder anamnese. Vivem fora da tela porque a leitura da
 * resposta (`P-05`) vai precisar das mesmas perguntas com o mesmo desenho, e
 * porque a regra de alerta é a mesma aqui e lá.
 */

/** Uma pergunta respondida é uma pergunta com valor não vazio. RA4 mora aqui. */
export const respondida = (v: string | undefined): boolean => (v ?? '').trim().length > 0;

export function disparaAlerta(p: Pergunta, valor: string | undefined): string | null {
  const regra = p.regraDeAlerta;
  if (!regra || !respondida(valor)) return null;
  const v = valor!.trim();
  if (regra.quando === 'PREENCHIDO') return regra.mensagem;
  if (regra.quando === 'IGUAL') return v === regra.valor ? regra.mensagem : null;
  if (regra.quando === 'DIFERENTE') return v !== regra.valor ? regra.mensagem : null;
  return null;
}

export function Opcao({
  rotulo,
  pergunta,
  marcada,
  multipla = false,
  campo,
  onEscolher,
}: {
  rotulo: string;
  /** Entra no nome acessível: um botão “Sim” solto não diz sim a quê. */
  pergunta: string;
  marcada: boolean;
  /** Marca quadrada: redondo promete escolha única, e essa promessa importa. */
  multipla?: boolean;
  campo: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      aria-label={`${rotulo} — ${pergunta}`}
      onClick={onEscolher}
      style={{
        flex: 1,
        minHeight: campo ? 'var(--target-field)' : 44,
        padding: '11px 15px',
        textAlign: 'left',
        borderRadius: 'var(--radius)',
        border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
        background: marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        color: marcada ? 'var(--color-royal-ink)' : 'var(--text-primary)',
        font: marcada ? 'var(--text-body-strong)' : 'var(--text-body)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: multipla ? 5 : '50%',
          border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: marcada ? 'var(--color-royal)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
      </span>
      {rotulo}
    </button>
  );
}

export function Resposta({
  pergunta: p,
  valor,
  campo,
  onResponder,
}: {
  pergunta: Pergunta;
  valor: string;
  campo: boolean;
  onResponder: (valor: string) => void;
}) {
  if (p.tipo === 'BOOLEANO') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        {['Sim', 'Não'].map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={valor === o}
            campo={campo}
            onEscolher={() => onResponder(o)}
          />
        ))}
      </div>
    );
  }

  if (p.tipo === 'ESCOLHA_UNICA') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.opcoes.map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={valor === o}
            campo={campo}
            onEscolher={() => onResponder(o)}
          />
        ))}
      </div>
    );
  }

  if (p.tipo === 'ESCOLHA_MULTIPLA') {
    const marcadas = valor ? valor.split(' · ') : [];
    /** A última opção é a exclusiva: marcar ela limpa o resto, e vice-versa. */
    const exclusiva = p.opcoes[p.opcoes.length - 1];
    const alternar = (o: string) => {
      if (o === exclusiva) return onResponder(marcadas.includes(o) ? '' : o);
      const sem = marcadas.filter((x) => x !== exclusiva && x !== o);
      onResponder((marcadas.includes(o) ? sem : [...sem, o]).join(' · '));
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.opcoes.map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={marcadas.includes(o)}
            multipla
            campo={campo}
            onEscolher={() => alternar(o)}
          />
        ))}
      </div>
    );
  }

  return (
    <TextField
      multiline={p.codigo !== 'CONTATO_EMERGENCIA'}
      density={campo ? 'field' : 'office'}
      value={valor}
      placeholder={p.codigo === 'CONTATO_EMERGENCIA' ? 'Nome e telefone de quem a casa liga' : 'Escreva com as suas palavras'}
      onChange={(e) => onResponder(e.target.value)}
    />
  );
}

export function MotivoDaPergunta({ pendente }: { pendente: PerguntaPendente }) {
  const m = pendente.motivo;
  if (m.tipo === 'PRIMEIRA_VEZ') return <StatusBadge tone="royal">primeira vez</StatusBadge>;
  if (m.tipo === 'REVALIDACAO') return <StatusBadge tone="attention">revalidação</StatusBadge>;
  if (m.tipo === 'POR_ESCOLHA') return <StatusBadge tone="confirmed">a seu pedido</StatusBadge>;
  if (m.tipo === 'NOVA_NA_VERSAO') return <StatusBadge tone="suggest">nova na v{m.versao}</StatusBadge>;
  return (
    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', textAlign: 'right' }}>
      substituiu “{m.textoAnterior}”
    </span>
  );
}

export function BlocoDePergunta({
  numero,
  total,
  pendente,
  valor,
  campo,
  onResponder,
}: {
  numero: number;
  total: number;
  pendente: PerguntaPendente;
  valor: string;
  campo: boolean;
  onResponder: (valor: string) => void;
}) {
  const p = pendente.pergunta;
  const alerta = disparaAlerta(p, valor);

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 9px', alignItems: 'center' }}>
          <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)' }}>
            {numero}/{total}
          </span>
          {p.sensivel ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                font: 'var(--text-label)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--color-suggest)',
              }}
            >
              <Icon name="key-round" size={13} color="var(--color-suggest)" />
              sensível
            </span>
          ) : null}
          {p.obrigatoria ? null : (
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>pode ficar em branco</span>
          )}
          <span style={{ flex: 1 }} />
          <MotivoDaPergunta pendente={pendente} />
        </div>

        <span style={{ font: campo ? 'var(--text-body-strong)' : 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {p.texto}
        </span>
      </div>

      <Resposta pergunta={p} valor={valor} campo={campo} onResponder={onResponder} />

      {alerta ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="circle-alert" size={15} color="var(--color-pending)" style={{ marginTop: 2 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Isso vira um <b style={{ color: 'var(--color-pending)' }}>ponto de atenção</b> para o acolhimento ler.{' '}
            <b>Não impede você de participar</b> — serve para a casa cuidar melhor de você.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}
