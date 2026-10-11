import { Button, TextField, type Density } from '@/ds';
import { Bloco } from '../Bloco';

export interface DadosParaACasaProps {
  emergencia: string;
  restricoes: string;
  onEmergencia: (v: string) => void;
  onRestricoes: (v: string) => void;
  densidade: Density;
}

export function DadosParaACasa({ emergencia, restricoes, onEmergencia, onRestricoes, densidade }: DadosParaACasaProps) {
  const campo = densidade === 'field';
  return (
    <Bloco titulo="O que a casa precisa saber de todo mundo" densidade={densidade}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Obrigatórios inclusive para quem não consagra. É a única obrigatoriedade dura da inscrição.
      </span>
      <TextField
        label="Contato de emergência"
        placeholder="Nome e telefone de quem a casa liga"
        value={emergencia}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onEmergencia(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TextField
          label="Restrições alimentares"
          placeholder="O que não come, ou “nenhuma”"
          value={restricoes}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onRestricoes(e.target.value)}
        />
        {restricoes.trim() ? null : (
          <Button variant="ghost" onClick={() => onRestricoes('Nenhuma')}>
            Não tem nenhuma
          </Button>
        )}
      </div>
    </Bloco>
  );
}
