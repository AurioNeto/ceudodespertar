import { Button, Cartao, Icon, Rotulo, type Density } from '@/ds';
import { linkDaCerimonia } from '../../../mocks/linkDaCerimonia';

export interface LinkDaCerimoniaProps {
  densidade: Density;
  copiado: boolean;
  onCopiar: () => void;
}

/**
 * O link da cerimônia. Fica em cima porque, na prática, é por ele que a maior
 * parte das inscrições entra: a recepção manda no WhatsApp e a pessoa se
 * cadastra e responde a própria anamnese. O que esta tela faz é o resto —
 * inscrever quem chegou por outro caminho e conferir o que já veio.
 */
export function LinkDaCerimonia({ densidade, copiado, onCopiar }: LinkDaCerimoniaProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
        <Icon name="link" size={17} color="var(--color-ink-brand)" />
        <Rotulo>Link de inscrição desta cerimônia</Rotulo>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {linkDaCerimonia.aberturas} aberturas · {linkDaCerimonia.inscricoesPeloLink} inscrições
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <code style={{ font: 'var(--text-code)', color: 'var(--text-link)', wordBreak: 'break-all' }}>
          {linkDaCerimonia.url}
        </code>
        <Button variant={copiado ? 'quiet' : 'ghost'} iconName={copiado ? 'check' : 'copy'} onClick={onCopiar}>
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Gerado quando a cerimônia foi criada. A pessoa abre, declara o CPF, se cadastra se for a primeira vez e{' '}
        <b>responde a própria anamnese</b> — ninguém da casa preenche saúde por ninguém.
      </span>
    </Cartao>
  );
}
