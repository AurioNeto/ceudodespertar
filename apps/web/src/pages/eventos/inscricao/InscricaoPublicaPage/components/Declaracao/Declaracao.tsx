import { Button, Cartao, Icon, Rotulo, type Density } from '@/ds';
import { TEXTO_DA_DECLARACAO, VERSAO_VIGENTE, type CadastroEncontrado } from '../../mocks/inscricaoPublica';
import { Passos } from '../Passos';
import { PortaDeRefazer } from './components/PortaDeRefazer';

export interface DeclaracaoProps {
  densidade: Density;
  cadastro: CadastroEncontrado | null;
  primeiroNome: string;
  refeita: boolean;
  declarado: boolean;
  onDeclarar: () => void;
  onRefazer: () => void;
  onSeguir: () => void;
}

export function Declaracao({
  densidade,
  cadastro,
  primeiroNome,
  refeita,
  declarado,
  onDeclarar,
  onRefazer,
  onSeguir,
}: DeclaracaoProps) {
  const campo = densidade === 'field';
  const emDia = cadastro?.modo === 'EM_DIA' && !refeita;
  return (
    <Passos
      titulo={emDia ? `Olá, ${primeiroNome}` : 'Uma última confirmação'}
      recado={
        emDia
          ? cadastro!.explicacao
          : 'Anamnese respondida. Falta só você confirmar que vale para este trabalho.'
      }
    >
      {cadastro ? (
        <Cartao campo={campo} style={{ gap: 7 }}>
          <Rotulo>O que a casa tem de você</Rotulo>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            {refeita
              ? `Anamnese v${VERSAO_VIGENTE} respondida agora, por você`
              : `Anamnese v${cadastro.versaoAnterior} respondida em ${cadastro.respondidaEm}`}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            {refeita
              ? `Substitui a resposta de ${cadastro.respondidaEm}. A anterior fica no histórico da casa, sem valer mais.`
              : emDia
                ? `Vale até ${cadastro.validaAte}.`
                : `Atualizada agora para a v${VERSAO_VIGENTE}.`}
          </span>
        </Cartao>
      ) : null}

      <button
        type="button"
        role="checkbox"
        aria-checked={declarado}
        onClick={onDeclarar}
        style={{
          textAlign: 'left',
          display: 'flex',
          gap: 13,
          alignItems: 'flex-start',
          padding: campo ? '15px 16px' : '17px 19px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${declarado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: declarado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: 6,
            marginTop: 1,
            border: `2px solid ${declarado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
            background: declarado ? 'var(--color-royal)' : 'transparent',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {declarado ? <Icon name="check" size={14} color="var(--bg-card)" /> : null}
        </span>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{TEXTO_DA_DECLARACAO}</span>
      </button>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>
        A casa pede isso a cada trabalho, mesmo de quem está em dia. É o jeito de saber de um remédio que começou
        semana passada sem obrigar todo mundo a refazer o formulário inteiro.
      </span>

      {refeita ? null : <PortaDeRefazer densidade={densidade} onRefazer={onRefazer} />}

      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="arrow-right"
        iconAfter
        disabled={!declarado}
        blockedReason={!declarado ? 'Marque a declaração acima para seguir.' : undefined}
        onClick={onSeguir}
      >
        Continuar
      </Button>
    </Passos>
  );
}
