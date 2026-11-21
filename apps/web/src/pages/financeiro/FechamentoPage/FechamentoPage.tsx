import { useState } from 'react';
import { ParametrosDoPeriodo, type Unidade } from '@cdd/contracts';
import { useSessao } from '@/app/sessao';
import { Aviso, Button, CorpoDaTela, ScreenHeader, Select, TextField, useDensidade } from '@/ds';
import { useItensDoCadastro } from '@/pages/components/CadastroDaApi';
import { DetalheDoPeriodo } from './components/DetalheDoPeriodo';

export function FechamentoPage() {
  const densidade = useDensidade();
  const { pode } = useSessao();
  const podeLerUnidades = pode('financeiro.plano_contas.ler');
  const unidades = useItensDoCadastro<Unidade>('/financeiro/unidades', podeLerUnidades);
  const [unidade, setUnidade] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [chave, setChave] = useState<ParametrosDoPeriodo | null>(null);
  const [erro, setErro] = useState(false);
  const nomeDaUnidade = unidades.data?.itens.find(item => item.id === chave?.unidadeId)?.nome ?? chave?.unidadeId ?? '';

  return (
    <>
      <ScreenHeader title="Fechamento" subtitle="Consulte e gerencie o período por unidade e competência" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1000}>
        <form style={{ display: 'grid', gap: 12 }} onSubmit={evento => {
          evento.preventDefault();
          const resultado = ParametrosDoPeriodo.safeParse({ unidadeId: unidade.trim(), competencia });
          setErro(!resultado.success);
          if (resultado.success) setChave(resultado.data);
        }}>
          {podeLerUnidades ? <Select label="Unidade" value={unidade} onChange={setUnidade} density={densidade}
            options={[{ value: '', label: 'Selecione uma unidade' }, ...(unidades.data?.itens ?? []).map(item => ({ value: item.id, label: item.nome }))]} /> :
            <TextField label="Identificador da unidade" value={unidade} density={densidade}
              onChange={evento => setUnidade(evento.currentTarget.value)} />}
          {unidades.isError ? <Aviso tom="pendente">Não foi possível carregar as unidades.
            <Button variant="quiet" onClick={() => void unidades.refetch()}>Tentar novamente</Button>
          </Aviso> : null}
          <TextField label="Competência" type="month" min="0001-01" max="9999-12" value={competencia} density={densidade}
            onChange={evento => setCompetencia(evento.currentTarget.value)} />
          {erro ? <p role="alert">Confira a unidade e a competência.</p> : null}
          <div><Button type="submit">Consultar período</Button></div>
        </form>
        {chave ? <DetalheDoPeriodo key={`${chave.unidadeId}:${chave.competencia}`} chave={chave} unidade={nomeDaUnidade} /> : null}
      </CorpoDaTela>
    </>
  );
}
