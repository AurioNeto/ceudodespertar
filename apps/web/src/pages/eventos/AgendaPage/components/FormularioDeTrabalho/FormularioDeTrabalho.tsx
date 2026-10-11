import { Button, PainelDeAcao, TextField, Select } from '@/ds';
import { CORES_POR_TIPO } from '../../constantes';
import type { TipoDeTrabalho } from '../../tipos';
import type { RascunhoDeTrabalho } from '../../utils/rascunhoDeTrabalho';
import { TarefasDoPreparo } from './components/TarefasDoPreparo';
import { ID_DO_CAMPO_DA_DATA, ID_DO_CAMPO_DE_CONTRIBUICOES } from './constantes';
import { useFormularioDeTrabalho } from './hooks/useFormularioDeTrabalho';

export interface FormularioDeTrabalhoProps {
  inicial: RascunhoDeTrabalho;
  onCancelar: () => void;
  onSalvar: (rascunho: RascunhoDeTrabalho) => void;
}

export function FormularioDeTrabalho({ inicial, onCancelar, onSalvar }: FormularioDeTrabalhoProps) {
  const { f, alterar, mexerNasTarefas, mover, erroDaData, erroDasContribuicoes, salvar } = useFormularioDeTrabalho(inicial, onSalvar);

  return (
    <PainelDeAcao aberto titulo={f.editId ? 'Editar cerimônia' : 'Nova cerimônia'} variante="central" aoFechar={onCancelar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nome" value={f.nome} onChange={(e) => alterar('nome', e.target.value)} placeholder="Mãe Divina" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <Select
            label="Tipo"
            value={f.tipo}
            options={(Object.keys(CORES_POR_TIPO) as TipoDeTrabalho[]).map((t) => ({ value: t, label: t }))}
            onChange={(v) => alterar('tipo', v as TipoDeTrabalho)}
          />
          <TextField
            id={ID_DO_CAMPO_DA_DATA}
            label="Data"
            value={f.data}
            onChange={(e) => alterar('data', e.target.value)}
            placeholder="05/09/2026"
            error={erroDaData}
          />
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
            id={ID_DO_CAMPO_DE_CONTRIBUICOES}
            label="Contribuições sugeridas"
            value={f.contribuicoes}
            onChange={(e) => alterar('contribuicoes', e.target.value)}
            placeholder="40, 60, 90"
            hint="uma ou mais opções, separadas por vírgula"
            error={erroDasContribuicoes}
          />
        </div>

        <TextField
          label="Observações"
          multiline
          value={f.observacoes}
          onChange={(e) => alterar('observacoes', e.target.value)}
        />

        <TarefasDoPreparo preparo={f.preparo} onMexerNasTarefas={mexerNasTarefas} onMover={mover} />

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            paddingTop: 12,
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
            onClick={salvar}
          >
            Salvar cerimônia
          </Button>
        </div>
      </div>
    </PainelDeAcao>
  );
}
