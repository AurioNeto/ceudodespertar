import { describe, expect, it, vi } from 'vitest';
import type { GrupoId, PedidoDeConvite, UsuarioId } from '@cdd/contracts';
import { fonteDeCredencialNula } from '../../dados/credencial';
import { criarClienteHttp, type ClienteHttp, type OpcoesDeRequisicao } from '../../dados/clienteHttp';
import { criarComandosDeAcessos } from './comandosDeAcessos';

const USUARIO = 'u-7' as UsuarioId;
const CHAVE = 'chave-do-formulario';

function clienteQueRegistra() {
  const requisitar = vi.fn((opcoes: OpcoesDeRequisicao) => Promise.resolve(opcoes as never));
  const cliente: ClienteHttp = { requisitar: requisitar as ClienteHttp['requisitar'] };
  return { cliente, requisitar };
}

describe('criarComandosDeAcessos', () => {
  it('convidar faz POST na coleção, com o pedido no corpo e sem versão', async () => {
    const { cliente, requisitar } = clienteQueRegistra();
    const pedido: PedidoDeConvite = { nome: 'Ana', email: 'ana@cdd.local', grupos: ['g-1' as GrupoId] };
    await criarComandosDeAcessos(cliente).convidar(pedido, { chaveDeIdempotencia: CHAVE });
    expect(requisitar).toHaveBeenCalledWith({
      metodo: 'POST',
      caminho: '/identidade/usuarios',
      corpo: pedido,
      chaveDeIdempotencia: CHAVE,
    });
  });

  it('convidar sem grupos não envia o campo grupos', async () => {
    const { cliente, requisitar } = clienteQueRegistra();
    await criarComandosDeAcessos(cliente).convidar({ nome: 'Ana', email: 'ana@cdd.local' });
    const [opcoes] = requisitar.mock.calls[0] ?? [];
    expect(opcoes?.corpo).toEqual({ nome: 'Ana', email: 'ana@cdd.local' });
    expect(opcoes?.corpo).not.toHaveProperty('grupos');
    expect(opcoes).not.toHaveProperty('chaveDeIdempotencia');
  });

  it.each([
    ['suspender', 'desativar'],
    ['reativar', 'reativar'],
  ] as const)('%s faz POST em /%s com motivo no corpo, versão e chave', async (comando, acao) => {
    const { cliente, requisitar } = clienteQueRegistra();
    await criarComandosDeAcessos(cliente)[comando](
      { usuarioId: USUARIO, versao: 4, motivo: 'deixou a tesouraria' },
      { chaveDeIdempotencia: CHAVE },
    );
    expect(requisitar).toHaveBeenCalledWith({
      metodo: 'POST',
      caminho: `/identidade/usuarios/u-7/${acao}`,
      corpo: { motivo: 'deixou a tesouraria' },
      versao: 4,
      chaveDeIdempotencia: CHAVE,
    });
  });

  it('definirGrupos faz PUT em /grupos com a lista no corpo e a versão', async () => {
    const { cliente, requisitar } = clienteQueRegistra();
    const grupos = ['g-1', 'g-2'] as GrupoId[];
    await criarComandosDeAcessos(cliente).definirGrupos({ usuarioId: USUARIO, versao: 2, grupos });
    expect(requisitar).toHaveBeenCalledWith({
      metodo: 'PUT',
      caminho: '/identidade/usuarios/u-7/grupos',
      corpo: { grupos },
      versao: 2,
    });
  });

  it('escapa o id no caminho', async () => {
    const { cliente, requisitar } = clienteQueRegistra();
    await criarComandosDeAcessos(cliente).suspender({ usuarioId: 'a/b' as UsuarioId, versao: 1, motivo: 'x' });
    expect(requisitar.mock.calls[0]?.[0].caminho).toBe('/identidade/usuarios/a%2Fb/desativar');
  });
});

describe('comandos de acessos sobre o cliente HTTP real', () => {
  function cabecalhosEnviados(fetch: ReturnType<typeof vi.fn>): Headers {
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    return new Headers(init.headers);
  }

  it('suspender envia If-Match com a versão e Idempotency-Key com a chave do formulário', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ situacao: 'SUSPENSO', versao: 5 }), { status: 200 })),
    );
    const cliente = criarClienteHttp({ credencial: fonteDeCredencialNula, fetch, gerarChave: () => 'automatica' });
    await criarComandosDeAcessos(cliente).suspender(
      { usuarioId: USUARIO, versao: 4, motivo: 'x' },
      { chaveDeIdempotencia: CHAVE },
    );
    const cabecalhos = cabecalhosEnviados(fetch);
    expect(cabecalhos.get('If-Match')).toBe('4');
    expect(cabecalhos.get('Idempotency-Key')).toBe(CHAVE);
  });
});
