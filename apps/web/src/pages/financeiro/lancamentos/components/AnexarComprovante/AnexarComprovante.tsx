import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { Aviso, Button, TextField } from '@/ds';
import { comandosDoLancamento, mensagemDeFalha } from '../../api';

interface Props {
  readonly id: string;
  readonly versao: number;
}

export function AnexarComprovante({ id, versao }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const { anexar } = comandosDoLancamento(useClienteHttp());
  const cliente = useQueryClient();
  const mutacao = useMutation({
    mutationFn: (selecionado: File) => anexar({ id, versao, arquivo: selecionado }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['lancamentos'] }),
    onError: () => void cliente.invalidateQueries({ queryKey: ['lancamentos'] }),
  });

  if (mutacao.isSuccess) return <p role="status">Comprovante anexado.</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <TextField label="Comprovante" type="file" accept="application/pdf,image/jpeg,image/png"
        disabled={mutacao.isPending}
        onChange={evento => {
          const campo = evento.currentTarget;
          setArquivo(campo instanceof HTMLInputElement ? campo.files?.[0] ?? null : null);
        }} />
      <Button variant="quiet" disabled={!arquivo || mutacao.isPending}
        onClick={() => { if (arquivo) mutacao.mutate(arquivo); }}>
        {mutacao.isPending ? 'Anexando…' : 'Anexar comprovante'}
      </Button>
      {mutacao.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDeFalha(mutacao.error)}</span></Aviso> : null}
    </div>
  );
}
