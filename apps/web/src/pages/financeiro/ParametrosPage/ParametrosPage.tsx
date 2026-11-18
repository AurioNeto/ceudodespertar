import { useState } from 'react';
import type { Unidade } from '@cdd/contracts';
import { Aviso, Button, CorpoDaTela, ScreenHeader, SeletorDeTipo, useDensidade } from '@/ds';
import { CadastroDaApi, useItensDoCadastro } from '@/pages/components/CadastroDaApi';
import { categorias, grupos, unidades } from './cadastros';

type Aba = 'categorias' | 'unidades' | 'grupos';

export function ParametrosPage() {
  const densidade = useDensidade();
  const [aba, setAba] = useState<Aba>('categorias');
  const opcoesDeUnidade = useItensDoCadastro<Unidade>(unidades.caminho, aba === 'categorias');
  const definicao = aba === 'unidades' ? unidades : aba === 'grupos' ? grupos : categorias(opcoesDeUnidade.data?.itens ?? []);
  return (
    <>
      <ScreenHeader title="Parâmetros" subtitle="Plano de contas, unidades e grupos de custo" density={densidade} />
      <CorpoDaTela densidade={densidade} larguraMaxima={1180}>
        <SeletorDeTipo opcoes={[
          { valor: 'categorias', label: 'Categorias' },
          { valor: 'unidades', label: 'Unidades e regimes' },
          { valor: 'grupos', label: 'Grupos de custo' },
        ]} valor={aba} onEscolher={setAba} densidade={densidade} />
        {aba === 'categorias' && !opcoesDeUnidade.isSuccess ? (
          opcoesDeUnidade.isError
            ? <Aviso tom="pendente">Não foi possível carregar as unidades. <Button variant="quiet" onClick={() => void opcoesDeUnidade.refetch()}>Tentar novamente</Button></Aviso>
            : <p role="status">Carregando unidades…</p>
        ) : <CadastroDaApi key={aba} definicao={definicao} />}
      </CorpoDaTela>
    </>
  );
}
