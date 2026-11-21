import type { FormEvent } from 'react';
import { Button, PainelDeAcao, TextField } from '@/ds';

export interface FolhaDeTextoProps {
  titulo: string;
  valor: string;
  placeholder?: string;
  aoMudar: (valor: string) => void;
  aoFechar: () => void;
}

export function FolhaDeTexto({ titulo, valor, placeholder, aoMudar, aoFechar }: FolhaDeTextoProps) {
  const concluir = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoFechar();
  };

  return (
    <PainelDeAcao aberto titulo={titulo} variante="folha" aoFechar={aoFechar}>
      <form onSubmit={concluir} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <TextField
          aria-label={titulo}
          density="field"
          value={valor}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(evento) => aoMudar(evento.target.value)}
        />
        <Button type="submit" density="field" fullWidth>
          Pronto
        </Button>
      </form>
    </PainelDeAcao>
  );
}
