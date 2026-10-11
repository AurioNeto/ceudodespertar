import { Button, Cartao, Rotulo, TextField, type Density } from '@/ds';
import { linkDaCerimonia } from '../../../mocks/linkDaCerimonia';
import { CPFS_DE_EXEMPLO } from '../../mocks/inscricaoPublica';
import { Passos } from '../Passos';

export interface IdentificacaoProps {
  densidade: Density;
  cpf: string;
  erro?: string;
  onCpf: (v: string) => void;
  onSeguir: () => void;
}

export function Identificacao({ densidade, cpf, erro, onCpf, onSeguir }: IdentificacaoProps) {
  const campo = densidade === 'field';
  return (
    <Passos
      titulo="Vamos começar pelo seu CPF"
      recado="Se você já veio aqui antes, a casa te reconhece e pergunta bem menos. Se é a primeira vez, o cadastro é rápido e serve para sempre."
    >
      <Cartao campo={campo} style={{ gap: 13 }}>
        <TextField
          label="CPF"
          placeholder="000.000.000-00"
          inputMode="numeric"
          value={cpf}
          error={erro}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onCpf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSeguir();
          }}
        />
        <Button fullWidth density={campo ? 'field' : 'office'} iconName="arrow-right" iconAfter onClick={onSeguir}>
          Continuar
        </Button>
      </Cartao>

      <Cartao campo={campo} style={{ gap: 9 }}>
        <Rotulo>Protótipo — CPFs que funcionam aqui</Rotulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {CPFS_DE_EXEMPLO.map((x) => (
            <button
              key={x.cpf}
              type="button"
              onClick={() => onCpf(x.cpf)}
              style={{
                textAlign: 'left',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                flexWrap: 'wrap',
                cursor: 'pointer',
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
              }}
            >
              <code style={{ font: 'var(--text-code)', color: 'var(--text-link)' }}>{x.cpf}</code>
              <span>{x.descricao}</span>
            </button>
          ))}
        </div>
      </Cartao>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Este link é desta cerimônia: <code style={{ font: 'var(--text-code)' }}>{linkDaCerimonia.url}</code>
      </span>
    </Passos>
  );
}
