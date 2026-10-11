import { Button, Interruptor, Select, TextField } from '@/ds';
import type { RascunhoDePergunta } from '../../../../tipos';
import { TIPOS_DE_PERGUNTA } from './constantes';

export interface FormularioDeNovaPerguntaProps {
  rascunho: RascunhoDePergunta;
  onMudar: (rascunho: RascunhoDePergunta) => void;
  onAdicionar: () => void;
  onCancelar: () => void;
}

export function FormularioDeNovaPergunta({ rascunho, onMudar, onAdicionar, onCancelar }: FormularioDeNovaPerguntaProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--bg-sunken)',
        borderRadius: 'var(--radius)',
        padding: '13px 14px',
      }}
    >
      <TextField
        label="Pergunta"
        value={rascunho.titulo}
        onChange={(e) => onMudar({ ...rascunho, titulo: e.target.value })}
        placeholder="Faz acompanhamento terapêutico hoje?"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        <Select
          label="Tipo de resposta"
          value={rascunho.tipo}
          options={TIPOS_DE_PERGUNTA.map((t) => ({ value: t, label: t }))}
          onChange={(v) => onMudar({ ...rascunho, tipo: v })}
        />
        <TextField
          label="Vira ponto de atenção quando"
          value={rascunho.alerta}
          onChange={(e) => onMudar({ ...rascunho, alerta: e.target.value })}
          placeholder="resposta sim"
          hint="em branco, a resposta não gera alerta"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1 }}>
          Resposta obrigatória
        </span>
        <Interruptor
          ligado={rascunho.obrigatoria}
          onAlternar={() => onMudar({ ...rascunho, obrigatoria: !rascunho.obrigatoria })}
          rotuloAcessivel="Resposta obrigatória"
        />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Button
          iconName="check"
          disabled={!rascunho.titulo.trim()}
          blockedReason={!rascunho.titulo.trim() ? 'Escreva a pergunta.' : undefined}
          onClick={onAdicionar}
        >
          Adicionar
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
