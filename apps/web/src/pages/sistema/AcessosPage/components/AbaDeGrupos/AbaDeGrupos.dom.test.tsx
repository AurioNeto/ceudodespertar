import { afterEach, describe, expect, it } from 'vitest';
import type { GrupoId } from '@cdd/contracts';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import {
  PERMISSAO_DE_GRUPOS,
  PERMISSAO_DE_USUARIOS,
  criarClienteFalso,
  erroDeServidor,
  grupoDaGestao,
  montarAcessos,
  pagina,
  usuarioListado,
} from '../../apoioDeTeste';
import type { RoteiroDoCliente } from '../../apoioDeTeste';

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

afterEach(async () => {
  while (montadas.length > 0) await montadas.pop()?.desmontar();
});

describe('Acessos: aba Grupos', () => {
  async function montarGrupos(sobrescritas: Partial<RoteiroDoCliente> = {}) {
    const montagem = await montar(sobrescritas);
    await montagem.tela.clicar('Grupos');
    return montagem;
  }

  it('mostra um cartão por grupo com nome, descrição, contagem e a marca protegido', async () => {
    const { tela } = await montarGrupos();
    const tesouraria = tela.container.querySelector('article[aria-label="Grupo Tesouraria"]');
    const guardiao = tela.container.querySelector('article[aria-label="Grupo Guardião"]');
    expect(tesouraria?.textContent).toContain('Cuida do caixa');
    expect(tesouraria?.textContent).toContain('2 usuários');
    expect(tesouraria?.textContent).not.toContain('protegido');
    expect(guardiao?.textContent).toContain('1 usuário');
    expect(guardiao?.textContent).not.toContain('1 usuários');
    expect(guardiao?.textContent).toContain('protegido');
  });

  it('lista as permissões pela descrição do catálogo, agrupadas por módulo', async () => {
    const { tela } = await montarGrupos({
      grupos: () => ({
        itens: [
          grupoDaGestao({
            permissoes: ['financeiro.lancamento.registrar', 'eventos.evento.criar', 'financeiro.conta.ler'],
          }),
        ],
      }),
    });
    const financeiro = tela.container.querySelector('section[aria-label="Permissões de financeiro do grupo Tesouraria"]');
    const eventos = tela.container.querySelector('section[aria-label="Permissões de eventos do grupo Tesouraria"]');
    expect(financeiro?.textContent).toContain('Registrar lançamento');
    expect(financeiro?.textContent).not.toContain('financeiro.lancamento.registrar');
    expect(financeiro?.textContent).toContain('Ler contas e saldos');
    expect(financeiro?.textContent).not.toContain('Criar evento');
    expect(eventos?.textContent).toContain('Criar evento');
  });

  it('código fora do catálogo aparece cru em outras', async () => {
    const { tela } = await montarGrupos({
      grupos: () => ({ itens: [grupoDaGestao({ permissoes: ['modulo.inventado.agir' as never] })] }),
    });
    const outras = tela.container.querySelector('section[aria-label="Permissões de outras do grupo Tesouraria"]');
    expect(outras?.textContent).toBe('outrasmodulo.inventado.agir');
  });

  it('grupo sem permissões diz que nenhuma foi concedida', async () => {
    const { tela } = await montarGrupos({ grupos: () => ({ itens: [grupoDaGestao({ permissoes: [] })] }) });
    expect(tela.texto()).toContain('Nenhuma permissão concedida');
  });

  it('erro mostra a mensagem e Tentar de novo recarrega os grupos', async () => {
    let falhar = true;
    const cliente = criarClienteFalso(
      roteiro({ grupos: () => (falhar ? erroDeServidor() : { itens: [GRUPO_GUARDIAO] }) }),
    );
    const tela = await montarAcessos(cliente, [PERMISSAO_DE_GRUPOS]);
    montadas.push(tela);
    expect(tela.texto()).toContain('Não foi possível carregar os grupos');
    falhar = false;
    await tela.clicar('Tentar de novo');
    expect(tela.texto()).toContain('Guardião');
    expect(tela.texto()).not.toContain('Não foi possível carregar os grupos');
  });

  it('vazio mostra Nenhum grupo cadastrado', async () => {
    const { tela } = await montarGrupos({ grupos: () => ({ itens: [] }) });
    expect(tela.texto()).toContain('Nenhum grupo cadastrado');
  });

  it('carregando mostra o esqueleto', async () => {
    const nunca = new Promise<never>(() => undefined);
    const cliente = criarClienteFalso(roteiro({ grupos: () => nunca }));
    const tela = await montarAcessos(cliente, [PERMISSAO_DE_GRUPOS]);
    montadas.push(tela);
    expect(tela.container.querySelector('style')?.textContent).toContain('cdd-sh');
    expect(tela.container.querySelector('article')).toBeNull();
  });
});
