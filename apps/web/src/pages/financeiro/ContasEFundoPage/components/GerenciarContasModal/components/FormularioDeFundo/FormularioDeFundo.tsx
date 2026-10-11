import type { Fundo } from '@cdd/contracts';
import { Rotulo } from '@/ds';
import { AcoesDoFormulario } from '../AcoesDoFormulario';
import { CampoDoModal } from '../CampoDoModal';

export interface FormularioDeFundoProps {
  fundo: Fundo;
  valor: string;
  erroDoValor?: string;
  onMudar: (f: Fundo, valor: string) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}

export function FormularioDeFundo({ fundo, valor, erroDoValor, onMudar, onCancelar, onSalvar }: FormularioDeFundoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Rotulo>{fundo.nome ? `Editar ${fundo.nome}` : 'Novo fundo'}</Rotulo>
      <CampoDoModal
        rotulo="Nome do fundo"
        valor={fundo.nome}
        placeholder="Obra do dormitório"
        onMudar={(nome) => onMudar({ ...fundo, nome }, valor)}
      />
      <CampoDoModal
        rotulo="Nota"
        valor={fundo.nota}
        placeholder="meta, prazo ou destino combinado"
        onMudar={(nota) => onMudar({ ...fundo, nota }, valor)}
      />
      <CampoDoModal
        rotulo="Valor alocado (R$)"
        valor={valor}
        placeholder="0,00"
        erro={erroDoValor}
        onMudar={(v) => onMudar(fundo, v)}
      />
      <AcoesDoFormulario rotuloSalvar="Salvar fundo" onCancelar={onCancelar} onSalvar={onSalvar} />
    </div>
  );
}
