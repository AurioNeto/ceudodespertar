import { Button, TextField, type Density } from '@/ds';
import type { Novo } from '../../tipos';
import { Passos } from '../Passos';

export interface PassoCadastroProps {
  densidade: Density;
  cpf: string;
  novo: Novo;
  faltando: readonly string[];
  onNovo: (novo: Novo) => void;
  onSeguir: () => void;
}

export function PassoCadastro({ densidade, cpf, novo, faltando, onNovo, onSeguir }: PassoCadastroProps) {
  const campo = densidade === 'field';
  return (
    <Passos titulo="Seu cadastro" recado={`O CPF ${cpf} ainda não está na casa. São cinco campos, uma vez só — na próxima cerimônia a casa já vai te reconhecer.`}>
      <TextField
        label="Nome completo"
        value={novo.nome}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onNovo({ ...novo, nome: e.target.value })}
      />
      <TextField
        label="Data de nascimento"
        placeholder="dd/mm/aaaa"
        value={novo.nascimento}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onNovo({ ...novo, nascimento: e.target.value })}
      />
      <TextField
        label="Telefone com WhatsApp"
        placeholder="(11) 90000-0000"
        value={novo.telefone}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onNovo({ ...novo, telefone: e.target.value })}
      />
      <TextField
        label="Cidade"
        value={novo.cidade}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onNovo({ ...novo, cidade: e.target.value })}
      />
      <TextField
        label="E-mail"
        hint="Pode ficar em branco. A casa fala com você pelo WhatsApp."
        value={novo.email}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onNovo({ ...novo, email: e.target.value })}
      />
      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="arrow-right"
        iconAfter
        disabled={faltando.length > 0}
        blockedReason={faltando.length > 0 ? `Falta ${faltando.join(', ')}.` : undefined}
        onClick={onSeguir}
      >
        Continuar
      </Button>
    </Passos>
  );
}
