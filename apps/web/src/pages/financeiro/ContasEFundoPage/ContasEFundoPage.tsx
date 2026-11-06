import { useState } from 'react';
import type { Conta, Unidade } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, EmptyState, ScreenHeader, SeletorDeTipo, TextField, useDensidade } from '@/ds';
import { CadastroDaApi, useItensDoCadastro, usePaginasDoCadastro } from '@/pages/components/CadastroDaApi';
import { formatarBRL } from '@/pages/utils/formato';
import { cadastroDeContas, cadastroDeFundos } from './cadastros';
import { useSaldos } from './consultas';

type Aba = 'saldos' | 'contas' | 'fundos';

export function ContasEFundoPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const [aba, setAba] = useState<Aba>('saldos');
  const [busca, setBusca] = useState('');
  const podeBuscarTitular = pode('financeiro.conta.gerenciar') && pode('pessoas.pessoa.ler');
  const pessoas = usePaginasDoCadastro('/pessoas', busca, aba === 'contas' && podeBuscarTitular);
  const titulares = pessoas.data?.pages.flatMap(pagina => pagina.itens.map(pessoa => ({ value: pessoa.id, label: pessoa.nome }))) ?? [];
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', aba === 'contas' && pode('financeiro.plano_contas.ler'));
  const contas = useItensDoCadastro<Conta>('/financeiro/contas', aba === 'fundos');
  const saldos = useSaldos(aba === 'saldos');

  return (
    <>
      <ScreenHeader title="Contas e fundos" subtitle="Saldos e cadastros financeiros" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1180}>
        <SeletorDeTipo opcoes={[
          { valor: 'saldos', label: 'Saldos' }, { valor: 'contas', label: 'Contas' }, { valor: 'fundos', label: 'Fundos' },
        ]} valor={aba} onEscolher={setAba} densidade={densidade} />
        {aba === 'saldos' ? <>
          <h2>Contas</h2>
          <ListaDeSaldos consulta={saldos.contas} valor={conta => conta.saldo} />
          <h2>Fundos</h2>
          <ListaDeSaldos consulta={saldos.fundos} valor={fundo => fundo.valorReservado} />
        </> : null}
        {aba === 'contas' ? <>
          {unidades.isError ? <Aviso tom="pendente">Não foi possível carregar as unidades. <Button variant="quiet" onClick={() => void unidades.refetch()}>Tentar novamente</Button></Aviso> : null}
          <CadastroDaApi key="contas" definicao={cadastroDeContas(unidades.data?.itens ?? [], titulares, podeBuscarTitular)}
            apoioPorCampo={{ pessoaTitularId: mudar => (<>
              <TextField label="Buscar titular para conta de terceiro" value={busca} maxLength={200}
                onChange={evento => {
                    mudar('');
                    setBusca(evento.currentTarget.value);
                  }} density={densidade} />
              {pessoas.isError ? <Aviso tom="pendente">Não foi possível carregar titulares. <Button variant="quiet" onClick={() => void pessoas.refetch()}>Tentar novamente</Button></Aviso> : null}
              {pessoas.hasNextPage ? <Button variant="quiet" disabled={pessoas.isFetchingNextPage} onClick={() => void pessoas.fetchNextPage()}>Carregar mais titulares</Button> : null}
            </>) }} />
        </> : null}
        {aba === 'fundos' ? <>
          {contas.isError ? <Aviso tom="pendente">Não foi possível carregar as contas vinculáveis. <Button variant="quiet" onClick={() => void contas.refetch()}>Tentar novamente</Button></Aviso> : null}
          <CadastroDaApi key="fundos" definicao={cadastroDeFundos(contas.data?.itens ?? [])} />
        </> : null}
      </CorpoDaTela>
    </>
  );
}

function ListaDeSaldos<T extends { readonly id: string; readonly nome: string }>({ consulta, valor }: {
  readonly consulta: { readonly isPending: boolean; readonly isError: boolean; readonly data?: readonly T[]; refetch(): Promise<unknown> };
  readonly valor: (item: T) => number;
}) {
  if (consulta.isPending) return <p role="status">Carregando saldos…</p>;
  if (consulta.isError) return <Aviso tom="pendente">Não foi possível carregar os saldos. <Button variant="quiet" onClick={() => void consulta.refetch()}>Tentar novamente</Button></Aviso>;
  if (!consulta.data?.length) return <EmptyState title="Nenhum saldo encontrado" />;
  return <ul>{consulta.data.map(item => <li key={item.id}>{item.nome} · {formatarBRL(valor(item))}</li>)}</ul>;
}
