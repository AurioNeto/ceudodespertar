import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrupoId, UsuarioId, UsuarioListado } from '@cdd/contracts';
import { assentar, criarAvisoDeEncerramentoFalso, criarEntradaFalsa, criarEu } from '../../app/apoioDeTeste';
import { ClienteHttpProvider } from '../../app/clienteHttp';
import { SessaoProvider } from '../../app/sessao';
import { ErroDaApi } from '../../dados/erros';
import {
  alternarGrupoNoPainel,
  botaoDoPainel,
  criarClienteFalso,
  digitarNoPainel,
  grupoDaGestao,
  gruposMarcadosNoPainel,
  pagina,
  painelAberto,
  textoDoPainel,
  usuarioListado,
} from './apoioDeTeste';
import { PainelDoUsuario } from './PainelDoUsuario';

const entradaFalsa = criarEntradaFalsa(true);
const { aoEncerrar } = criarAvisoDeEncerramentoFalso();
const buscarEu = () => Promise.resolve(criarEu());

const JOAO = usuarioListado();
const MARIA = usuarioListado({
  id: 'u-2' as UsuarioId,
  nome: 'Maria das Graças',
  email: 'maria@cdd.local',
  grupos: [{ id: 'g-2' as GrupoId, nome: 'Secretaria' }],
});

interface Registro {
  aoFechar: ReturnType<typeof vi.fn<() => void>>;
  aoAtualizarUsuario: ReturnType<typeof vi.fn<(usuario: UsuarioListado) => void>>;
  trocarPara(usuario: UsuarioListado | null): Promise<void>;
}

let container: HTMLElement;
let raiz: Root;
let trocar: (usuario: UsuarioListado | null) => void = () => undefined;

function Anfitriao({ inicial, registro }: { inicial: UsuarioListado; registro: Pick<Registro, 'aoFechar' | 'aoAtualizarUsuario'> }) {
  const [usuario, setUsuario] = useState<UsuarioListado | null>(inicial);
  trocar = setUsuario;
  return (
    <PainelDoUsuario
      usuario={usuario}
      variante="lateral"
      densidade="office"
      aoFechar={registro.aoFechar}
      aoAtualizarUsuario={registro.aoAtualizarUsuario}
      focoDeReserva={() => null}
    />
  );
}

async function montar(comando: () => Promise<unknown>, usuario = JOAO): Promise<Registro> {
  const cliente = criarClienteFalso({
    usuarios: () => pagina([]),
    grupos: () => ({ itens: [grupoDaGestao(), grupoDaGestao({ id: 'g-2' as GrupoId, nome: 'Secretaria', codigoSistema: null })] }),
    usuario: () => usuarioListado({ versao: 2, grupos: [{ id: 'g-1' as GrupoId, nome: 'Tesouraria' }] }),
    comando,
  });
  const registro = { aoFechar: vi.fn<() => void>(), aoAtualizarUsuario: vi.fn<(u: UsuarioListado) => void>() };
  await act(async () =>
    raiz.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SessaoProvider entrada={entradaFalsa} aoEncerrar={aoEncerrar} buscarEu={buscarEu}>
          <ClienteHttpProvider cliente={cliente}>
            <Anfitriao inicial={usuario} registro={registro} />
          </ClienteHttpProvider>
        </SessaoProvider>
      </QueryClientProvider>,
    ),
  );
  await assentar();
  return {
    ...registro,
    trocarPara: async (proximo) => {
      await act(async () => trocar(proximo));
      await assentar();
    },
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  raiz = createRoot(container);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  container.remove();
});

const gerenciarGrupos = async () => {
  await alternarGrupoNoPainel('Secretaria');
  await act(async () => botaoDoPainel('Salvar grupos').click());
};

describe('PainelDoUsuario: resposta que chega depois de o painel sair de cena', () => {
  it('409 de A depois de fechar não reabre nem atualiza o pai', async () => {
    let rejeitar: (erro: Error) => void = () => undefined;
    const registro = await montar(() => new Promise((_, falhar) => (rejeitar = falhar)));
    await gerenciarGrupos();
    await registro.trocarPara(null);
    await act(async () => rejeitar(new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' })));
    await assentar();
    expect(registro.aoAtualizarUsuario).not.toHaveBeenCalled();
    expect(painelAberto()).toBeNull();
  });

  it('sucesso de A depois de abrir B não fecha o painel de B', async () => {
    let liberar: (valor: unknown) => void = () => undefined;
    const registro = await montar(() => new Promise((resolver) => (liberar = resolver)));
    await gerenciarGrupos();
    await registro.trocarPara(MARIA);
    await act(async () => liberar({ grupos: [], versao: 2 }));
    await assentar();
    expect(registro.aoFechar).not.toHaveBeenCalled();
    expect(textoDoPainel()).toContain('Gerenciar Maria das Graças');
  });

  it('409 de A depois de abrir B não troca B por A nem contamina os grupos marcados', async () => {
    let rejeitar: (erro: Error) => void = () => undefined;
    const registro = await montar(() => new Promise((_, falhar) => (rejeitar = falhar)));
    await gerenciarGrupos();
    await registro.trocarPara(MARIA);
    await act(async () => rejeitar(new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' })));
    await assentar();
    expect(registro.aoAtualizarUsuario).not.toHaveBeenCalled();
    expect(textoDoPainel()).toContain('Gerenciar Maria das Graças');
    expect(gruposMarcadosNoPainel()).toEqual(['Secretaria']);
  });

  it('trocar de usuário descarta o que foi digitado para o anterior', async () => {
    const registro = await montar(() => Promise.reject(new Error('sem comando')));
    await digitarNoPainel('Motivo', 'texto do João');
    await registro.trocarPara(MARIA);
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  });
});
