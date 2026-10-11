import { afterEach, describe, expect, it } from 'vitest';
import type { GrupoId } from '@cdd/contracts';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import {
  PERMISSAO_DE_GRUPOS,
  PERMISSAO_DE_USUARIOS,
  criarClienteFalso,
  grupoDaGestao,
  montarAcessos,
  pagina,
  usuarioListado,
} from './apoioDeTeste';
import type { RoteiroDoCliente } from './apoioDeTeste';

const montadas: TelaMontada[] = [];

const GRUPO_TESOURARIA = grupoDaGestao();
const GRUPO_GUARDIAO = grupoDaGestao({
  id: 'g-2' as GrupoId,
  codigoSistema: null,
  nome: 'Guardião',
  descricao: 'Cuida da casa',
  permissoes: ['eventos.evento.criar'],
  protegido: true,
  usuarios: 1,
});

function roteiro(sobrescritas: Partial<RoteiroDoCliente> = {}): RoteiroDoCliente {
  return {
    usuarios: () => pagina([usuarioListado()]),
    grupos: () => ({ itens: [GRUPO_TESOURARIA, GRUPO_GUARDIAO] }),
    ...sobrescritas,
  };
}

async function montar(
  sobrescritas: Partial<RoteiroDoCliente> = {},
  permissoes = [PERMISSAO_DE_USUARIOS, PERMISSAO_DE_GRUPOS],
) {
  const cliente = criarClienteFalso(roteiro(sobrescritas));
  const tela = await montarAcessos(cliente, permissoes);
  montadas.push(tela);
  return { cliente, tela };
}

const nomesDasAbas = (tela: TelaMontada) =>
  Array.from(tela.container.querySelectorAll('button[aria-pressed]')).map((b) => b.textContent);

afterEach(async () => {
  while (montadas.length > 0) await montadas.pop()?.desmontar();
});

describe('Acessos: abas por permissão', () => {
  it('com gerenciar usuários mostra as duas abas e abre em Usuários', async () => {
    const { tela } = await montar();
    expect(nomesDasAbas(tela)).toEqual(['Usuários', 'Grupos']);
    expect(tela.container.querySelector('ul[aria-label="Usuários"]')).not.toBeNull();
  });

  it('só com gerenciar grupos esconde Usuários, abre em Grupos e não pede usuários', async () => {
    const { cliente, tela } = await montar({}, [PERMISSAO_DE_GRUPOS]);
    expect(nomesDasAbas(tela)).toEqual([]);
    expect(tela.texto()).toContain('Guardião');
    expect(tela.container.querySelector('ul[aria-label="Usuários"]')).toBeNull();
    expect(cliente.chamadasDeUsuarios()).toHaveLength(0);
  });

  it('só com gerenciar usuários mostra as duas abas e troca para Grupos', async () => {
    const { tela } = await montar({}, [PERMISSAO_DE_USUARIOS]);
    expect(nomesDasAbas(tela)).toEqual(['Usuários', 'Grupos']);
    await tela.clicar('Grupos');
    expect(tela.container.querySelector('article[aria-label="Grupo Guardião"]')).not.toBeNull();
  });
});
