import { Aviso, CorpoDaTela, ScreenHeader, useDensidade, SeletorDeTipo, Recado } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { BuracoDoRelatorio } from './components/BuracoDoRelatorio';
import { ListaDeUnidades } from './components/ListaDeUnidades';
import { ParametrosDaCasa } from './components/ParametrosDaCasa';
import { TabelaDeCategorias } from './components/TabelaDeCategorias';
import { useCorrecaoDeLinha } from './hooks/useCorrecaoDeLinha';

export function ParametrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useCorrecaoDeLinha();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-15 · F-16 · A-03' : 'F-15, F-16 e A-03 · Parâmetros'}
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

        {tela.aba === 'categorias' ? (
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
              onLinha={tela.setLinhaEscolhida}
              onEditar={tela.editar}
              onCancelar={tela.cancelar}
              onCorrigir={tela.corrigir}
            />
          </>
        ) : null}

        {tela.aba === 'unidades' ? (
          <>
            {tela.semRegime.length > 0 ? (
              <Aviso tom="pendente" titulo={`${pluralizar(tela.semRegime.length, 'unidade')} sem regime definido`}>
                O regime governa o vocabulário da tela, quais categorias a unidade aceita e se a receita gera obrigação
                fiscal. É decisão da coordenação, não do sistema — e trava o seed das unidades.
              </Aviso>
            ) : null}
            <ListaDeUnidades densidade={densidade} />
          </>
        ) : null}

        {tela.aba === 'casa' ? <ParametrosDaCasa densidade={densidade} /> : null}
      </CorpoDaTela>
    </>
  );
}
