import type { Conta } from '@cdd/contracts';
import { entrada, rotuloLabel } from '../../constantes';
import { AcoesDoFormulario } from '../AcoesDoFormulario';
import { CampoDoModal } from '../CampoDoModal';

export interface FormularioDeContaProps {
  conta: Conta;
  onMudar: (c: Conta) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}

export function FormularioDeConta({ conta, onMudar, onCancelar, onSalvar }: FormularioDeContaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={rotuloLabel}>{conta.nome ? `Editar ${conta.nome}` : 'Nova conta'}</span>
      <CampoDoModal
        rotulo="Nome da conta"
        valor={conta.nome}
        placeholder="Cora PJ"
        onMudar={(nome) => onMudar({ ...conta, nome })}
      />
      <CampoDoModal
        rotulo="Descrição"
        valor={conta.descricao}
        placeholder="conta principal da casa"
        onMudar={(descricao) => onMudar({ ...conta, descricao })}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>Categoria</span>
          <select
            value={conta.tipo}
            onChange={(e) => onMudar({ ...conta, tipo: e.target.value as Conta['tipo'] })}
            style={entrada}
          >
            <option value="CONTA_CORRENTE">Banco</option>
            <option value="DINHEIRO">Espécie (caixa)</option>
          </select>
        </label>
        <CampoDoModal
          rotulo="Responsável"
          valor={conta.responsavel}
          placeholder="quem cuida desta conta"
          onMudar={(responsavel) => onMudar({ ...conta, responsavel })}
        />
      </div>
      <AcoesDoFormulario rotuloSalvar="Salvar conta" onCancelar={onCancelar} onSalvar={onSalvar} />
    </div>
  );
}
