import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { useSessao } from '@/app/sessao';
import { criarComando, criarConsulta, ErroDaApi, ErroDeRede } from '@/dados';
import type { ClienteHttp } from '@/dados';
import { desmontarTudo } from './montagem';
import {
  criarApiDeTeste,
  falharSeSobrouRotaNaoDeclarada,
  montarComDados,
  recusar,
  responder,
} from './montagemComDados';
import { criarAvisoDeEncerramentoFalso, criarEntradaFalsa, criarEu } from './sessaoDeTeste';

interface Conta {
  readonly nome: string;
}

function ListaDeContas({ caminho = '/financeiro/contas' }: { readonly caminho?: string }) {
  const consulta = useQuery(criarConsulta(useClienteHttp())<readonly Conta[]>(caminho));
  if (consulta.error instanceof ErroDaApi) return <p>erro da api: {consulta.error.codigo}</p>;
  if (consulta.error instanceof ErroDeRede) return <p>erro de rede: {(consulta.error.cause as Error).message}</p>;
  return <ul>{consulta.data?.map((conta) => <li key={conta.nome}>{conta.nome}</li>)}</ul>;
}

function NomeDaSessaoEContas() {
  const { usuario } = useSessao();
  return (
    <>
      <p>{usuario?.nome}</p>
      <ListaDeContas />
    </>
  );
}

function GuardarCliente({ guardar }: { readonly guardar: (cliente: ClienteHttp) => void }) {
  guardar(useClienteHttp());
  return null;
}

afterEach(desmontarTudo);

describe('montarComDados', () => {
  it('entrega ao componente a resposta declarada para a rota', async () => {
    const tela = await montarComDados(<ListaDeContas />, {
      'GET /financeiro/contas': responder([{ nome: 'Caixa' }, { nome: 'Banco' }]),
    });

    expect(tela.container.textContent).toBe('CaixaBanco');
  });

  it('entrega o erro declarado como ErroDaApi com o código', async () => {
    const tela = await montarComDados(<ListaDeContas />, {
      'GET /financeiro/contas': recusar(403, 'SEM_PERMISSAO'),
    });

    expect(tela.container.textContent).toBe('erro da api: SEM_PERMISSAO');
  });

  it('recusa rota não declarada com mensagem que diz qual rota foi chamada', async () => {
    const tela = await montarComDados(<ListaDeContas caminho="/financeiro/fundos" />, {
      'GET /financeiro/contas': responder([]),
    });

    expect(tela.container.textContent).toBe(
      'erro de rede: rota não declarada no teste: GET /financeiro/fundos (declaradas: GET /financeiro/contas)',
    );
    expect(tela.api.retirarRotasNaoDeclaradas()).toEqual(['GET /financeiro/fundos']);
    expect(tela.api.chamadas().map((chamada) => chamada.caminho)).toEqual(['/financeiro/fundos']);
  });

  it.fails('reprova o caso quando sobra rota não declarada ao fim', async () => {
    await montarComDados(<ListaDeContas caminho="/financeiro/fundos" />, {});
  });

  it('a conferência do fim do caso diz quais rotas sobraram', async () => {
    const api = criarApiDeTeste({});
    await expect(api.cliente.requisitar({ metodo: 'GET', caminho: 'financeiro/fundos' })).rejects.toMatchObject({
      cause: new Error('rota não declarada no teste: GET /financeiro/fundos (declaradas: nenhuma)'),
    });

    expect(() => falharSeSobrouRotaNaoDeclarada(api)).toThrow(
      'a tela chamou rota não declarada no teste: GET /financeiro/fundos',
    );
    expect(() => falharSeSobrouRotaNaoDeclarada(api)).not.toThrow();
  });

  it('casa a query string literalmente e aceita resposta calculada pela chamada', async () => {
    const api = criarApiDeTeste({
      'GET /financeiro/lancamentos?desde=2026-10-23': (chamada) => responder({ visto: chamada.caminho }),
    });

    await expect(
      api.cliente.requisitar({ metodo: 'GET', caminho: '/financeiro/lancamentos?desde=2026-10-23' }),
    ).resolves.toEqual({ visto: '/financeiro/lancamentos?desde=2026-10-23' });
    await expect(api.cliente.requisitar({ metodo: 'GET', caminho: '/financeiro/lancamentos' })).rejects.toBeInstanceOf(
      ErroDeRede,
    );
    api.retirarRotasNaoDeclaradas();
  });

  it('401 sem sessão chega como NAO_AUTENTICADO em uma só chamada', async () => {
    const api = criarApiDeTeste({ 'GET /eu': recusar(401, 'NAO_AUTENTICADO') });

    await expect(api.cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    });
    expect(api.chamadas()).toHaveLength(1);
  });

  it('204 descarta o corpo declarado', async () => {
    const api = criarApiDeTeste({ 'DELETE /financeiro/contas/c-1': responder({ ignorado: true }, 204) });

    await expect(api.cliente.requisitar({ metodo: 'DELETE', caminho: '/financeiro/contas/c-1' })).resolves.toBeUndefined();
  });

  it('com sessão, a tela lê o usuário e a API; acesso recusado avisa a sessão', async () => {
    const recusa = criarAvisoDeEncerramentoFalso();
    const disparar = vi.spyOn(recusa, 'disparar');
    const tela = await montarComDados(
      <NomeDaSessaoEContas />,
      {
        'GET /financeiro/contas': recusar(401, 'USUARIO_SUSPENSO'),
      },
      { sessao: { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()), recusa } },
    );

    expect(tela.container.textContent).toBe('Ana Souzaerro da api: USUARIO_SUSPENSO');
    expect(disparar).toHaveBeenCalledOnce();
  });

  it('registra corpo, Idempotency-Key e If-Match das chamadas', async () => {
    let cliente: ClienteHttp | undefined;
    const tela = await montarComDados(<GuardarCliente guardar={(atual) => (cliente = atual)} />, {
      'POST /financeiro/contas': responder({ id: 'c-1' }, 201),
      'PATCH /financeiro/contas/c-1': responder(undefined, 204),
    });
    const comando = criarComando(cliente as ClienteHttp);
    const criar = comando<{ nome: string }, { id: string }>({
      metodo: 'POST',
      caminho: '/financeiro/contas',
      corpo: (entrada) => entrada,
    });
    const renomear = comando<{ nome: string; versao: number }, void>({
      metodo: 'PATCH',
      caminho: '/financeiro/contas/c-1',
      corpo: ({ nome }) => ({ nome }),
      versao: ({ versao }) => versao,
    });

    await expect(criar({ nome: 'Caixa' })).resolves.toEqual({ id: 'c-1' });
    await renomear({ nome: 'Caixa da casa', versao: 3 }, { chaveDeIdempotencia: 'chave-explicita' });

    expect(tela.api.chamadas()).toEqual([
      {
        metodo: 'POST',
        caminho: '/financeiro/contas',
        corpo: { nome: 'Caixa' },
        cabecalhos: expect.objectContaining({ 'Idempotency-Key': 'chave-de-teste-1' }),
      },
      {
        metodo: 'PATCH',
        caminho: '/financeiro/contas/c-1',
        corpo: { nome: 'Caixa da casa' },
        cabecalhos: expect.objectContaining({ 'Idempotency-Key': 'chave-explicita', 'If-Match': '3' }),
      },
    ]);
  });

  it('não depende de cache de outro caso: cada montagem tem o seu QueryClient', async () => {
    const primeira = await montarComDados(<ListaDeContas />, { 'GET /financeiro/contas': responder([{ nome: 'Caixa' }]) });
    const segunda = await montarComDados(<ListaDeContas />, { 'GET /financeiro/contas': responder([{ nome: 'Banco' }]) });

    expect(primeira.clienteDeConsultas).not.toBe(segunda.clienteDeConsultas);
    expect(segunda.container.textContent).toBe('Banco');
  });

  it('atualizar mantém os provedores em volta da nova árvore', async () => {
    const tela = await montarComDados(<p>antes</p>, { 'GET /financeiro/contas': responder([{ nome: 'Caixa' }]) });

    await tela.atualizar(<ListaDeContas />);

    expect(tela.container.textContent).toBe('Caixa');
  });
});
