import { ScreenHeader, useDensidade, SeletorDeTipo } from '@/ds';
import { formatarDinheiro, pluralizar } from '@/pages/utils/formato';
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
        code={campo ? 'F-02' : 'F-02 · Meus registros'}
        title="Meus registros"
        subtitle={campo ? undefined : 'O que você lançou nos últimos 30 dias · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 20px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 18,
          maxWidth: campo ? undefined : 1000,
          minWidth: 0,
        }}
      >
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
          {campo ? null : (
            <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {pluralizar(meus.registros.length, 'lançamento')} · saídas {formatarDinheiro(meus.saidas)} · entradas{' '}
              {formatarDinheiro(meus.entradas)}
            </span>
          )}
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
      </div>
    </>
  );
}
