import { Fragment, type ReactNode } from 'react';
import { Aviso, Button, EmptyState, PainelDeAcao, Select, StatusBadge, TextField, useDensidade, varianteDoPainel } from '@/ds';
import { paraCampo, useCadastroDaApi } from './hooks/useCadastroDaApi';
import type { DefinicaoDoCadastro } from './tipos';

interface CadastroDaApiProps {
  readonly definicao: DefinicaoDoCadastro;
  readonly apoioPorCampo?: Readonly<Record<string, (mudar: (valor: string) => void) => ReactNode>>;
}

export function CadastroDaApi({ definicao, apoioPorCampo }: CadastroDaApiProps) {
  const tela = useCadastroDaApi(definicao);
  const densidade = useDensidade();
  const singular = definicao.singular;
  return (
    <>
      {definicao.paginado ? <TextField label="Buscar por nome ou documento" value={tela.busca} maxLength={200}
        onChange={evento => tela.setBusca(evento.currentTarget.value)} density={densidade} /> : null}
      {tela.podeCriar ? <div><Button onClick={() => tela.abrir(null)}>Adicionar {singular}</Button></div> : null}
      {tela.consulta.isPending ? <p role="status">Carregando cadastro…</p> : null}
      {tela.consulta.isError ? (
        <Aviso tom="pendente">Não foi possível carregar o cadastro. <Button variant="quiet" onClick={() => void tela.consulta.refetch()}>Tentar novamente</Button></Aviso>
      ) : null}
      {tela.consulta.isSuccess && tela.itens.length === 0 ? <EmptyState title="Nenhum registro encontrado" /> : null}
      {tela.itens.length > 0 ? (
        <ul aria-label={`Cadastro de ${singular}`} style={{ listStyle: 'none', padding: 0 }}>
          {tela.itens.map(registro => (
            <li key={registro.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: 'var(--border-hairline)' }}>
              <div style={{ flex: 1 }}>
                <strong>{registro.nome}</strong>
                {definicao.campos.filter(campo => campo.exibir).map(campo => {
                  const valor = paraCampo(Object.getOwnPropertyDescriptor(registro, campo.nome)?.value, campo);
                  return valor ? <div key={campo.nome}>{campo.opcoes?.find(opcao => opcao.value === valor)?.label ?? valor}</div> : null;
                })}
              </div>
              {(registro.ativa ?? registro.ativo) === false ? <StatusBadge tone="neutral">Inativo</StatusBadge> : null}
              {tela.podeEditar ? <Button variant="ghost" aria-label={`Editar ${registro.nome}`} onClick={() => tela.abrir(registro)}>Editar</Button> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {definicao.paginado && tela.paginas.hasNextPage ? (
        <div><Button variant="ghost" disabled={tela.paginas.isFetchingNextPage} onClick={() => void tela.paginas.fetchNextPage()}>Carregar mais</Button></div>
      ) : null}
      {tela.editor ? (
        <PainelDeAcao aberto titulo={`${tela.editor.registro ? 'Editar' : 'Adicionar'} ${singular}`}
          variante={varianteDoPainel(densidade)} aoFechar={tela.fechar}>
          <form onSubmit={evento => { evento.preventDefault(); tela.salvar(); }} style={{ display: 'grid', gap: 12 }}>
            {tela.campos.filter(campo => !campo.oculto).map(campo => (
              <Fragment key={campo.nome}>
                {apoioPorCampo?.[campo.nome]?.(valor => tela.mudar(campo.nome, valor))}
                {campo.opcoes ? (
                  <Select label={campo.rotulo} value={tela.editor?.valores[campo.nome] ?? ''}
                    options={campo.opcoes} onChange={valor => tela.mudar(campo.nome, valor)} density={densidade} />
                ) : (
                  <TextField label={campo.rotulo} value={tela.editor?.valores[campo.nome] ?? ''}
                    inputMode={campo.formato === 'moeda' ? 'decimal' : undefined}
                    onChange={evento => tela.mudar(campo.nome, evento.currentTarget.value)} density={densidade} />
                )}
              </Fragment>
            ))}
            {tela.erro ? <Aviso tom="pendente"><span role="alert">{tela.erro}</span></Aviso> : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" disabled={tela.fechandoBloqueado}>{tela.fechandoBloqueado ? 'Salvando…' : 'Salvar'}</Button>
              <Button variant="quiet" onClick={tela.fechar} disabled={tela.fechandoBloqueado}>Cancelar</Button>
            </div>
          </form>
        </PainelDeAcao>
      ) : null}
    </>
  );
}
