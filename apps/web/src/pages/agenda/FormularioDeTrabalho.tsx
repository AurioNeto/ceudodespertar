import { useState } from 'react';
import { Button, Icon, TextField } from '../../ds';
import { Select } from '../../components/Campo';
import { CORES_POR_TIPO, type TarefaDePreparo, type TipoDeTrabalho, type Trabalho } from '../../mocks/agenda';

export interface RascunhoDeTrabalho {
  editId: number | null;
  nome: string;
  tipo: TipoDeTrabalho;
  data: string;
  horario: string;
  local: string;
  dirigente: string;
  previstos: string;
  litros: string;
  contribuicoes: string;
  observacoes: string;
  preparo: TarefaDePreparo[];
}

export const rascunhoVazio = (): RascunhoDeTrabalho => ({
  editId: null,
  nome: '',
  tipo: 'Concentração',
  data: '',
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: '',
  previstos: '',
  litros: '',
  contribuicoes: '',
  observacoes: '',
  preparo: [
    { titulo: 'Limpeza do salão', responsavel: '' },
    { titulo: 'Compra de mantimentos', responsavel: '' },
  ],
});

export const rascunhoDe = (ev: Trabalho): RascunhoDeTrabalho => ({
  editId: ev.id,
  nome: ev.nome,
  tipo: ev.tipo,
  data: `${String(ev.dia).padStart(2, '0')}/${String(ev.mes).padStart(2, '0')}/${ev.ano}`,
  horario: ev.horario,
  local: ev.local,
  dirigente: ev.dirigente,
  previstos: String(ev.previstos),
  litros: String(ev.litros),
  contribuicoes: ev.contribuicoes.join(', '),
  observacoes: ev.observacoes,
  preparo: ev.preparo.map((t) => ({ ...t })),
});

export interface FormularioDeTrabalhoProps {
  inicial: RascunhoDeTrabalho;
  onCancelar: () => void;
  onSalvar: (rascunho: RascunhoDeTrabalho) => void;
}

export function FormularioDeTrabalho({ inicial, onCancelar, onSalvar }: FormularioDeTrabalhoProps) {
  const [f, setF] = useState(inicial);

  const alterar = <K extends keyof RascunhoDeTrabalho>(campo: K, valor: RascunhoDeTrabalho[K]) =>
    setF((atual) => ({ ...atual, [campo]: valor }));

  const mexerNasTarefas = (fn: (lista: TarefaDePreparo[]) => TarefaDePreparo[]) =>
    setF((atual) => ({ ...atual, preparo: fn(atual.preparo.map((t) => ({ ...t }))) }));

  const mover = (i: number, delta: number) =>
    mexerNasTarefas((lista) => {
      const j = i + delta;
      if (j < 0 || j >= lista.length) return lista;
      const tmp = lista[i]!;
      lista[i] = lista[j]!;
      lista[j] = tmp;
      return lista;
    });

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,24,0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {f.editId ? 'Editar cerimônia' : 'Nova cerimônia'}
          </span>
          <button type="button" aria-label="fechar" onClick={onCancelar} style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <TextField label="Nome" value={f.nome} onChange={(e) => alterar('nome', e.target.value)} placeholder="Mãe Divina" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
            <Select
              label="Tipo"
              value={f.tipo}
              options={(Object.keys(CORES_POR_TIPO) as TipoDeTrabalho[]).map((t) => ({ value: t, label: t }))}
              onChange={(v) => alterar('tipo', v as TipoDeTrabalho)}
            />
            <TextField label="Data" value={f.data} onChange={(e) => alterar('data', e.target.value)} placeholder="05/09/2026" />
            <TextField label="Horário" value={f.horario} onChange={(e) => alterar('horario', e.target.value)} />
            <TextField label="Local" value={f.local} onChange={(e) => alterar('local', e.target.value)} />
            <TextField label="Dirigente" value={f.dirigente} onChange={(e) => alterar('dirigente', e.target.value)} />
            <TextField
              label="Previstos"
              value={f.previstos}
              onChange={(e) => alterar('previstos', e.target.value)}
              inputMode="numeric"
            />
            <TextField
              label="Litros previstos"
              value={f.litros}
              onChange={(e) => alterar('litros', e.target.value)}
              inputMode="decimal"
            />
            <TextField
              label="Contribuições sugeridas"
              value={f.contribuicoes}
              onChange={(e) => alterar('contribuicoes', e.target.value)}
              placeholder="40, 60, 90"
              hint="uma ou mais opções, separadas por vírgula"
            />
          </div>

          <TextField
            label="Observações"
            multiline
            value={f.observacoes}
            onChange={(e) => alterar('observacoes', e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span
                style={{
                  font: 'var(--text-label)',
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                  color: 'var(--text-field-label)',
                }}
              >
                Lista de preparo
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {f.preparo.length === 0
                  ? 'nenhuma tarefa'
                  : `${f.preparo.length} ${f.preparo.length === 1 ? 'tarefa' : 'tarefas'}`}
              </span>
            </div>

            {f.preparo.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={t.titulo}
                  onChange={(e) =>
                    mexerNasTarefas((lista) => {
                      lista[i] = { ...lista[i]!, titulo: e.target.value };
                      return lista;
                    })
                  }
                  placeholder="o que precisa ser feito"
                  aria-label={`tarefa ${i + 1}`}
                  style={{ ...entradaDaTarefa, flex: 2 }}
                />
                <input
                  value={t.responsavel}
                  onChange={(e) =>
                    mexerNasTarefas((lista) => {
                      lista[i] = { ...lista[i]!, responsavel: e.target.value };
                      return lista;
                    })
                  }
                  placeholder="responsável"
                  aria-label={`responsável pela tarefa ${i + 1}`}
                  style={{ ...entradaDaTarefa, flex: 1 }}
                />
                <BotaoDaTarefa rotulo="subir" onClick={() => mover(i, -1)}>
                  ↑
                </BotaoDaTarefa>
                <BotaoDaTarefa rotulo="descer" onClick={() => mover(i, 1)}>
                  ↓
                </BotaoDaTarefa>
                <BotaoDaTarefa
                  rotulo="remover"
                  onClick={() => mexerNasTarefas((lista) => lista.filter((_, j) => j !== i))}
                >
                  ×
                </BotaoDaTarefa>
              </div>
            ))}

            <Button
              variant="quiet"
              iconName="plus"
              onClick={() => mexerNasTarefas((lista) => [...lista, { titulo: '', responsavel: '' }])}
              style={{ alignSelf: 'flex-start' }}
            >
              Adicionar tarefa
            </Button>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              Tarefa em branco é descartada ao salvar; responsável vazio vira "a definir".
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            padding: '12px 20px 16px',
            borderTop: 'var(--border-hairline)',
          }}
        >
          <Button variant="quiet" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button
            iconName="check"
            disabled={!f.nome.trim()}
            blockedReason={!f.nome.trim() ? 'A cerimônia precisa de um nome.' : undefined}
            onClick={() => onSalvar(f)}
          >
            Salvar cerimônia
          </Button>
        </div>
      </div>
    </div>
  );
}

const entradaDaTarefa = {
  minHeight: 40,
  border: '1px solid var(--color-line-strong)',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  font: 'var(--text-body)',
  color: 'var(--text-primary)',
  outline: 'none',
  minWidth: 0,
} as const;

function BotaoDaTarefa({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        flex: '0 0 auto',
        border: '1px solid var(--color-line)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
