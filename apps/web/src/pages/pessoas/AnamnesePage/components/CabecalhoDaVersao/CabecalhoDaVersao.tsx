import { Button, StatusBadge } from '@/ds';
import { TOM_DA_SITUACAO } from '../../constantes';
import type { VersaoDoFormulario } from '../../mocks/anamnese';
import { Cartao } from '../Cartao';

export interface CabecalhoDaVersaoProps {
  versao: VersaoDoFormulario;
  ehRascunho: boolean;
  onPublicar: () => void;
  onCopiarLink: () => void;
}

export function CabecalhoDaVersao({ versao, ehRascunho, onPublicar, onCopiarLink }: CabecalhoDaVersaoProps) {
  return (
    <Cartao>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{versao.rotulo}</span>
        <StatusBadge tone={TOM_DA_SITUACAO[versao.situacao]}>
          {versao.situacao[0]!.toUpperCase()}
          {versao.situacao.slice(1)}
        </StatusBadge>
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          criada em {versao.criadaEm} por {versao.criadaPor}
          {versao.publicadaEm ? ` · publicada em ${versao.publicadaEm}` : ''}
        </span>
      </div>
      <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{versao.descricao}</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {ehRascunho ? (
          <Button iconName="check-check" onClick={onPublicar}>
            Publicar versão
          </Button>
        ) : null}
        {versao.situacao === 'publicada' ? (
          <Button variant="ghost" iconName="link" onClick={onCopiarLink}>
            Copiar link público
          </Button>
        ) : null}
      </div>
    </Cartao>
  );
}
