import { Button, ScreenHeader, EmptyState, useDensidade } from '@/ds';
import { Paginacao } from '../components/Paginacao';
import { pluralizar } from '@/pages/utils/formato';
import { FiltrosDoLivro } from './components/FiltrosDoLivro';
import { GavetaDeDetalhe } from './components/GavetaDeDetalhe';
import { ListaDoLivro } from './components/ListaDoLivro';
import { ResumoDoPeriodo } from './components/ResumoDoPeriodo';
import { TabelaDoLivro } from './components/TabelaDoLivro';
import { useFiltrosDoLivro } from './hooks/useFiltrosDoLivro';

export function LancamentosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const livro = useFiltrosDoLivro();

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-03' : 'F-03 · Lançamentos'}
        title="Lançamentos"
        subtitle={campo ? undefined : 'Todos os lançamentos da unidade, de todas as pessoas · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 20px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          minWidth: 0,
        }}
      >
        <FiltrosDoLivro
          filtros={livro.filtros}
          densidade={densidade}
          onFiltrar={livro.filtrar}
          onLimpar={livro.limparFiltros}
        />

        <ResumoDoPeriodo lista={livro.lista} densidade={densidade} />

        {livro.lista.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento neste recorte"
            description="Troque o período ou limpe os filtros para ver o livro inteiro."
            action={
              <Button variant="ghost" onClick={livro.limparFiltros}>
                Limpar filtros
              </Button>
            }
          />
        ) : campo ? (
          <ListaDoLivro registros={livro.daPagina} onAbrir={livro.abrirDetalhe} />
        ) : (
          <TabelaDoLivro registros={livro.daPagina} selecionado={livro.selecionado} onAbrir={livro.abrirDetalhe} />
        )}

        {livro.lista.length > 0 ? (
          <Paginacao
            pagina={livro.paginaAtual}
            totalPaginas={livro.totalPaginas}
            texto={`Página ${livro.paginaAtual + 1} de ${livro.totalPaginas} · ${pluralizar(livro.lista.length, 'lançamento')}`}
            onAnterior={livro.paginaAnterior}
            onProxima={livro.proximaPagina}
            densidade={densidade}
          />
        ) : null}
      </div>

      {livro.selecionado ? (
        <GavetaDeDetalhe registro={livro.selecionado} densidade={densidade} onFechar={livro.fecharDetalhe} />
      ) : null}
    </div>
  );
}
