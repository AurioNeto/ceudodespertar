import { Cartao, Rotulo, StatusBadge, type Density } from '@/ds';
import { ANAMNESE_ROTULO, TOM_DA_ANAMNESE } from '../../constantes';
import type { PessoaDoDiretorio } from '../../mocks/inscricao';

export interface EstadoDaAnamneseProps {
  pessoa: PessoaDoDiretorio;
  exigida: boolean;
  densidade: Density;
}

export function EstadoDaAnamnese({ pessoa, exigida, densidade }: EstadoDaAnamneseProps) {
  const campo = densidade === 'field';
  const emDia = pessoa.anamnese === 'OK';
  return (
    <Cartao campo={campo} style={{ gap: 9 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
        <Rotulo>Anamnese</Rotulo>
        <StatusBadge tone={exigida ? TOM_DA_ANAMNESE[pessoa.anamnese]! : 'neutral'}>
          {exigida ? ANAMNESE_ROTULO[pessoa.anamnese] : 'Não se aplica'}
        </StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{pessoa.anamneseNota}</span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {exigida
          ? emDia
            ? 'Em dia.'
            : 'Enquanto não estiver em dia, a inscrição pode ser salva, mas não confirmada.'
          : 'Quem não consagra não precisa responder. O estado antigo continua guardado, apenas não se aplica a este trabalho.'}{' '}
        Esta tela mostra o estado, <b>nunca as respostas</b> — abrir a anamnese é outro ato, em outra tela, e fica
        registrado lá.
      </span>
    </Cartao>
  );
}
