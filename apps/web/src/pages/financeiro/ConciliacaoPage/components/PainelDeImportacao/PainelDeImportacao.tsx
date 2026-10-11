import { Button, Icon, Select, Rotulo, type Density } from '@/ds';
import { formatarData, pluralizar } from '@/pages/utils/formato';
import { contasComExtrato, importacao } from '../../mocks/conciliacao';

export interface PainelDeImportacaoProps {
  densidade: Density;
  importado: boolean;
  conta: string;
  onConta: (v: string) => void;
  onImportar: () => void;
}

export function PainelDeImportacao({ densidade, importado, conta, onConta, onImportar }: PainelDeImportacaoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '17px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'flex-end',
      }}
    >
      <Select
        label="Conta"
        value={conta}
        options={contasComExtrato.map((c) => ({ value: c.id, label: c.nome }))}
        onChange={onConta}
      />

      <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Rotulo>Arquivo do banco</Rotulo>
        <div
          style={{
            border: '1px dashed var(--color-line-strong)',
            borderRadius: 'var(--radius)',
            padding: '10px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 'var(--target-office)',
          }}
        >
          <Icon name="paperclip" size={17} color="var(--text-meta)" />
          <span style={{ flex: 1, font: 'var(--text-body)', color: 'var(--text-primary)' }}>{importacao.arquivo}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>OFX</span>
        </div>
      </div>

      <Button iconName="file-spreadsheet" onClick={onImportar} density={campo ? 'field' : 'office'}>
        {importado ? 'Reimportar' : 'Importar extrato'}
      </Button>

      {importado ? (
        <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {importacao.arquivo} · {formatarData(importacao.periodo.de)} a {formatarData(importacao.periodo.ate)} ·{' '}
            {pluralizar(importacao.linhasLidas, 'linha')} lidas
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
            {importacao.linhasJaConhecidas} já existiam e não entraram de novo
          </span>
        </div>
      ) : null}
    </div>
  );
}
