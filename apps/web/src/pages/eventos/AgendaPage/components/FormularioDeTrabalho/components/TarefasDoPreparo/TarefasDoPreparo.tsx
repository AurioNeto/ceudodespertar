import { Button } from '@/ds';
import type { TarefaDePreparo } from '../../../../tipos';
import { BotaoDaTarefa } from './components/BotaoDaTarefa';
import { entradaDaTarefa } from './constantes';

export interface TarefasDoPreparoProps {
  preparo: TarefaDePreparo[];
  onMexerNasTarefas: (fn: (lista: TarefaDePreparo[]) => TarefaDePreparo[]) => void;
  onMover: (i: number, delta: number) => void;
}

export function TarefasDoPreparo({ preparo, onMexerNasTarefas, onMover }: TarefasDoPreparoProps) {
  return (
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
          {preparo.length === 0
            ? 'nenhuma tarefa'
            : `${preparo.length} ${preparo.length === 1 ? 'tarefa' : 'tarefas'}`}
        </span>
      </div>

      {preparo.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={t.titulo}
            onChange={(e) =>
              onMexerNasTarefas((lista) => {
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
              onMexerNasTarefas((lista) => {
                lista[i] = { ...lista[i]!, responsavel: e.target.value };
                return lista;
              })
            }
            placeholder="responsável"
            aria-label={`responsável pela tarefa ${i + 1}`}
            style={{ ...entradaDaTarefa, flex: 1 }}
          />
          <BotaoDaTarefa rotulo="subir" onClick={() => onMover(i, -1)}>
            ↑
          </BotaoDaTarefa>
          <BotaoDaTarefa rotulo="descer" onClick={() => onMover(i, 1)}>
            ↓
          </BotaoDaTarefa>
          <BotaoDaTarefa
            rotulo="remover"
            onClick={() => onMexerNasTarefas((lista) => lista.filter((_, j) => j !== i))}
          >
            ×
          </BotaoDaTarefa>
        </div>
      ))}

      <Button
        variant="quiet"
        iconName="plus"
        onClick={() => onMexerNasTarefas((lista) => [...lista, { titulo: '', responsavel: '' }])}
        style={{ alignSelf: 'flex-start' }}
      >
        Adicionar tarefa
      </Button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Tarefa em branco é descartada ao salvar; responsável vazio vira "a definir".
      </span>
    </div>
  );
}
