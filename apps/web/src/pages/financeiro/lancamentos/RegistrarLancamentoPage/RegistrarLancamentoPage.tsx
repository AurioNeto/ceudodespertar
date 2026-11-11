import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DadosDoLancamento } from '@cdd/contracts';
import { useClienteHttp } from '@/app/providers';
import { Aviso, CorpoDaTela, ScreenHeader, useDensidade } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { comandosDoLancamento, mensagemDeFalha, type ReciboDoLancamento } from '../api';
import { AnexarComprovante } from '../components/AnexarComprovante';
import { FormularioFinanceiro } from '../components/FormularioFinanceiro';

export function RegistrarLancamentoPage() {
  const densidade = useDensidade();
  const cliente = useQueryClient();
  const { registrar } = comandosDoLancamento(useClienteHttp());
  const tentativa = useRef<{ corpo: string; chave: string } | null>(null);
  const [numero, setNumero] = useState(0);
  const [recibo, setRecibo] = useState<ReciboDoLancamento | undefined>();
  const mutacao = useMutation({
    mutationFn: (dados: DadosDoLancamento) => {
      const corpo = JSON.stringify(dados);
      if (tentativa.current?.corpo !== corpo) tentativa.current = { corpo, chave: crypto.randomUUID() };
      return registrar(dados, tentativa.current.chave);
    },
    onSuccess: registro => {
      tentativa.current = null;
      setRecibo(registro);
      setNumero(atual => atual + 1);
      void cliente.invalidateQueries({ queryKey: ['lancamentos'] });
    },
  });

  return (
    <>
      <ScreenHeader title="Registrar lançamento" subtitle="Entradas e saídas ficam a conferir" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={860}>
        {mutacao.isSuccess ? <Aviso tom="informacao"><span role="status">Lançamento registrado. Status: A conferir.</span></Aviso> : null}
        {recibo ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <strong>{recibo.motivo} · {formatarBRL(recibo.valor)}</strong>
            <AnexarComprovante key={recibo.id} id={recibo.id} versao={recibo.versao} />
          </div>
        ) : null}
        {mutacao.isError ? <Aviso tom="pendente"><span role="alert">{mensagemDeFalha(mutacao.error)}</span></Aviso> : null}
        <FormularioFinanceiro key={numero} ocupado={mutacao.isPending} enviar={dados => mutacao.mutate(dados)} />
      </CorpoDaTela>
    </>
  );
}
