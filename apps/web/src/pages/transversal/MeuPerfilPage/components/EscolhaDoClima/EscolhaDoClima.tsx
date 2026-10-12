import { Cartao, CLIMAS, SeletorDeTipo, useClima, type Density } from '@/ds';

interface EscolhaDoClimaProps {
  readonly densidade: Density;
}

export function EscolhaDoClima({ densidade }: EscolhaDoClimaProps) {
  const { clima, definirClima } = useClima();

  return (
    <Cartao campo={densidade === 'field'}>
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Aparência</div>
        <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Vale só neste aparelho; a escolha não acompanha a sua conta.
        </div>
      </div>
      <SeletorDeTipo opcoes={CLIMAS} valor={clima} onEscolher={definirClima} densidade={densidade} />
    </Cartao>
  );
}
