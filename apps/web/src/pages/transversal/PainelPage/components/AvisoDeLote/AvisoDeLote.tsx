import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '@/ds';
import { ROTAS } from '@/app/rotas';
import { remessasEmLote } from '../../mocks/resumoFinanceiro';
import { filaDeVerificacaoInicial } from '@/mocks/verificacao';
import { pluralizar } from '@/pages/utils/formato';

export function AvisoDeLote() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
        background: 'var(--color-pending-soft)',
        border: '1px solid var(--color-pending-border)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
      }}
    >
      <Icon name="sparkles" size={20} color="var(--color-pending)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {filaDeVerificacaoInicial.length} lançamentos em lote aguardando verificação —{' '}
          {pluralizar(remessasEmLote, 'remessa')} de comprovantes
        </div>
        <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          A IA leu os comprovantes e propôs valor, data e categoria — uma pessoa precisa verificar antes de
          consolidar. Lançamento feito à mão já entra consolidado.
        </div>
      </div>
      <Button onClick={() => navigate(ROTAS.lote)}>Verificar lote</Button>
    </div>
  );
}
