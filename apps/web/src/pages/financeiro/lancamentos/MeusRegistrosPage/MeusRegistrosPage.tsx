import { CorpoDaTela, ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { CarrosselDeRecibos } from './components/CarrosselDeRecibos';
import { ListaSimplificada } from './components/ListaSimplificada';
import { useMeusRegistros } from './hooks/useMeusRegistros';

export function MeusRegistrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const meus = useMeusRegistros();

  return (
    <>
      <ScreenHeader
        title="Meus registros"
        subtitle={campo ? undefined : 'O que você lançou nos últimos 30 dias · CDD'}
        density={densidade}
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1000}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <SeletorDeTipo
            opcoes={[
              { valor: 'lista', label: 'Lista simplificada' },
              { valor: 'carrossel', label: 'Visão completa' },
            ]}
            valor={meus.visao}
            onEscolher={meus.escolherVisao}
            densidade={densidade}
          />
        </div>

        {meus.visao === 'lista' ? (
          <ListaSimplificada
            registros={meus.daPagina}
            pagina={meus.pagina}
            totalPaginas={meus.totalPaginas}
            densidade={densidade}
            onAbrir={meus.abrirNoCartao}
            onAnterior={meus.paginaAnterior}
            onProxima={meus.proximaPagina}
          />
        ) : (
          <CarrosselDeRecibos
            registros={meus.registros}
            indice={meus.indice}
            densidade={densidade}
            onIrPara={meus.irPara}
          />
        )}
      </CorpoDaTela>
    </>
  );
}
