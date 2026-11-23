import { Aviso, CorpoDaTela, InfraError, Recado, ScreenHeader, SeletorDeTipo, SkeletonList, useDensidade } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { BuracoDoRelatorio } from './components/BuracoDoRelatorio';
import { ListaDeUnidades } from './components/ListaDeUnidades';
import { ParametrosDaCasa } from './components/ParametrosDaCasa';
import { TabelaDeCategorias } from './components/TabelaDeCategorias';
import { MENSAGEM_DE_FALHA_NAS_CATEGORIAS, MENSAGEM_DE_FALHA_NAS_UNIDADES } from './constantes';
import { useCorrecaoDeLinha } from './hooks/useCorrecaoDeLinha';

export function ParametrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useCorrecaoDeLinha();

  return (
    <>
      <ScreenHeader
        title="Parâmetros"
        subtitle={campo ? undefined : 'Plano de contas, unidades e o que a casa configura · CDD'}
        density={densidade}
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1180}>
        <SeletorDeTipo
          opcoes={[
            { valor: 'categorias', label: 'Categorias' },
            { valor: 'unidades', label: 'Unidades e regimes' },
            { valor: 'casa', label: 'Instituição' },
          ]}
          valor={tela.aba}
          onEscolher={tela.escolherAba}
          densidade={densidade}
        />

        {tela.recado ? <Recado texto={tela.recado} onFechar={tela.fecharRecado} /> : null}

        {tela.erroAoSalvar ? (
          <Aviso tom="atencao" role="alert">
            {tela.erroAoSalvar}
          </Aviso>
        ) : null}

        {tela.aba === 'categorias' && tela.consultaDeCategorias.isPending ? <SkeletonList rows={6} /> : null}

        {tela.aba === 'categorias' && tela.consultaDeCategorias.isError && !tela.consultaDeCategorias.data ? (
          <InfraError
            description={MENSAGEM_DE_FALHA_NAS_CATEGORIAS}
            onRetry={() => void tela.consultaDeCategorias.refetch()}
          />
        ) : null}

        {tela.aba === 'categorias' && tela.consultaDeCategorias.data ? (
          <>
            {tela.semLinha.length > 0 ? (
              <BuracoDoRelatorio quantidade={tela.semLinha.length} lancamentos={tela.semLinha.reduce((s, c) => s + c.lancamentos, 0)} />
            ) : (
              <Aviso tom="confirmado">Toda categoria ativa tem linha de relatório. Nada fica fora do DRE.</Aviso>
            )}

            <TabelaDeCategorias
              categorias={tela.categorias}
              densidade={densidade}
              editando={tela.editando}
              linhaEscolhida={tela.linhaEscolhida}
              salvando={tela.salvando}
              onLinha={tela.setLinhaEscolhida}
              onEditar={tela.editar}
              onCancelar={tela.cancelar}
              onCorrigir={tela.corrigir}
            />
          </>
        ) : null}

        {tela.aba === 'unidades' && tela.consultaDeUnidades.isPending ? <SkeletonList rows={3} /> : null}

        {tela.aba === 'unidades' && tela.consultaDeUnidades.isError && !tela.consultaDeUnidades.data ? (
          <InfraError
            description={MENSAGEM_DE_FALHA_NAS_UNIDADES}
            onRetry={() => void tela.consultaDeUnidades.refetch()}
          />
        ) : null}

        {tela.aba === 'unidades' && tela.consultaDeUnidades.data ? (
          <>
            {tela.semRegime.length > 0 ? (
              <Aviso tom="pendente" titulo={`${pluralizar(tela.semRegime.length, 'unidade')} sem regime definido`}>
                O regime governa o vocabulário da tela, quais categorias a unidade aceita e se a receita gera obrigação
                fiscal. É decisão da coordenação, não do sistema — e trava o seed das unidades.
              </Aviso>
            ) : null}
            <ListaDeUnidades unidades={tela.unidades} densidade={densidade} />
          </>
        ) : null}

        {tela.aba === 'casa' ? <ParametrosDaCasa densidade={densidade} /> : null}
      </CorpoDaTela>
    </>
  );
}
