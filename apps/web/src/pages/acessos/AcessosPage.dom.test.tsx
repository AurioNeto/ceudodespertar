import { afterEach, describe, expect, it } from 'vitest';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { assentar, type TelaMontada } from '../../app/apoioDeTeste';
import { ATRASO_DA_BUSCA_EM_MS } from './AbaDeUsuarios';
import {
  ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS,
  PERMISSAO_DE_GRUPOS,
  PERMISSAO_DE_USUARIOS,
  campoPorRotulo,
  criarClienteFalso,
  digitar,
  erroDeServidor,
  escolher,
  esperar,
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
    expect(nomesDasAbas(tela)).toEqual(['Grupos']);
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

describe('Acessos: aba Usuários', () => {
  it('renderiza nome, e-mail, último acesso, grupos e situação de cada usuário', async () => {
    const { tela } = await montar({
      usuarios: () =>
        pagina([
          usuarioListado(),
          usuarioListado({
            id: 'u-2' as never,
            nome: 'João Pereira',
            email: 'joao@cdd.local',
            situacao: 'CONVITE_PENDENTE',
            ultimoAcessoEm: null,
            grupos: [],
          }),
        ]),
    });
    const linhas = Array.from(tela.container.querySelectorAll('ul[aria-label="Usuários"] > li'));
    expect(linhas).toHaveLength(2);
    expect(linhas[0]?.textContent).toContain('Maria das Graças');
    expect(linhas[0]?.textContent).toContain('maria@cdd.local');
    expect(linhas[0]?.textContent).toContain('Último acesso: 09/10/2026 14:30');
    expect(linhas[0]?.textContent).toContain('Tesouraria');
    expect(linhas[0]?.textContent).toContain('Ativo');
    expect(linhas[0]?.textContent).toContain('MG');
    expect(linhas[1]?.textContent).toContain('Último acesso: nunca');
    expect(linhas[1]?.textContent).toContain('Convite pendente');
  });

  it.each([
    ['SUSPENSO', 'Suspenso'],
    ['REVOGADO', 'Revogado'],
  ] as const)('situação %s aparece como %s', async (situacao, rotulo) => {
    const { tela } = await montar({ usuarios: () => pagina([usuarioListado({ situacao })]) });
    expect(tela.container.querySelector('ul[aria-label="Usuários"] > li')?.textContent).toContain(rotulo);
  });

  it('não oferece ações por linha', async () => {
    const { tela } = await montar();
    expect(tela.container.querySelectorAll('ul[aria-label="Usuários"] button')).toHaveLength(0);
  });

  it('a primeira chamada pede o limite padrão sem cursor nem filtros', async () => {
    const { cliente } = await montar();
    expect(cliente.chamadasDeUsuarios().map((p) => Object.fromEntries(p))).toEqual([{ limite: '50' }]);
  });

  it('Carregar mais pede depois=<proxima>, acrescenta os itens e some no fim', async () => {
    const { cliente, tela } = await montar({
      usuarios: (parametros) =>
        parametros.get('depois') === 'c1'
          ? pagina([usuarioListado({ id: 'u-3' as never, nome: 'Zélia Costa' })], null)
          : pagina([usuarioListado()], 'c1'),
    });
    expect(tela.texto()).toContain('Carregar mais');
    await tela.clicar('Carregar mais');
    expect(cliente.chamadasDeUsuarios().map((p) => p.get('depois'))).toEqual([null, 'c1']);
    expect(tela.container.querySelectorAll('ul[aria-label="Usuários"] > li')).toHaveLength(2);
    expect(tela.texto()).toContain('Maria das Graças');
    expect(tela.texto()).toContain('Zélia Costa');
    expect(tela.texto()).not.toContain('Carregar mais');
  });

  it('sem próxima página o botão nem aparece', async () => {
    const { tela } = await montar();
    expect(tela.texto()).not.toContain('Carregar mais');
  });

  it('falha ao carregar mais mantém a lista e oferece tentar de novo', async () => {
    let falhar = true;
    const { tela } = await montar({
      usuarios: (parametros) => {
        if (parametros.get('depois') === null) return pagina([usuarioListado()], 'c1');
        if (falhar) return erroDeServidor();
        return pagina([usuarioListado({ id: 'u-3' as never, nome: 'Zélia Costa' })]);
      },
    });
    await tela.clicar('Carregar mais');
    expect(tela.texto()).toContain('Não foi possível carregar mais usuários');
    expect(tela.texto()).toContain('Maria das Graças');
    expect(tela.texto()).toContain('Tentar de novo');
    expect(tela.texto()).not.toContain('Carregar mais');
    falhar = false;
    await tela.clicar('Tentar de novo');
    expect(tela.texto()).toContain('Zélia Costa');
    expect(tela.texto()).not.toContain('Não foi possível carregar mais usuários');
  });

  it('situação e grupo vão para a query string e reiniciam o cursor', async () => {
    const { cliente, tela } = await montar({
      usuarios: (parametros) => (parametros.get('depois') === null ? pagina([usuarioListado()], 'c1') : pagina([])),
    });
    await tela.clicar('Carregar mais');
    await escolher(tela, 'Situação', 'SUSPENSO');
    await assentar();
    await escolher(tela, 'Grupo', 'g-2');
    await assentar();
    const chamadas = cliente.chamadasDeUsuarios().map((p) => Object.fromEntries(p));
    expect(chamadas).toEqual([
      { limite: '50' },
      { depois: 'c1', limite: '50' },
      { situacao: 'SUSPENSO', limite: '50' },
      { situacao: 'SUSPENSO', grupoId: 'g-2', limite: '50' },
    ]);
  });

  it('as opções de grupo vêm do GET de grupos', async () => {
    const { tela } = await montar();
    const opcoes = Array.from(campoPorRotulo<HTMLSelectElement>(tela, 'Grupo').options).map((o) => o.textContent);
    expect(opcoes).toEqual(['Todos', 'Tesouraria', 'Guardião']);
  });

  it('voltar a Todas mostra de novo a lista sem filtro', async () => {
    const suspensa = usuarioListado({ id: 'u-2' as UsuarioId, nome: 'Joana Suspensa', situacao: 'SUSPENSO' });
    const { tela } = await montar({
      usuarios: (parametros) => (parametros.get('situacao') ? pagina([suspensa]) : pagina([usuarioListado()])),
    });
    await escolher(tela, 'Situação', 'SUSPENSO');
    await assentar();
    expect(tela.texto()).not.toContain('Maria das Graças');
    await escolher(tela, 'Situação', '');
    await assentar();
    expect(tela.texto()).toContain('Maria das Graças');
    expect(tela.texto()).not.toContain('Joana Suspensa');
  });

  it('a busca espera o atraso, usa o texto aparado e reinicia o cursor', async () => {
    const { cliente, tela } = await montar({
      usuarios: (parametros) => (parametros.get('depois') === null ? pagina([usuarioListado()], 'c1') : pagina([])),
    });
    await tela.clicar('Carregar mais');
    const antes = cliente.chamadasDeUsuarios().length;
    await digitar(tela, 'Buscar', '  ana ');
    await assentar();
    expect(cliente.chamadasDeUsuarios()).toHaveLength(antes);
    await esperar(ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS);
    await assentar();
    const chamadas = cliente.chamadasDeUsuarios();
    expect(chamadas).toHaveLength(antes + 1);
    expect(Object.fromEntries(chamadas.at(-1) ?? [])).toEqual({ busca: 'ana', limite: '50' });
  });

  it('várias teclas seguidas viram uma única chamada', async () => {
    const { cliente, tela } = await montar();
    await digitar(tela, 'Buscar', 'a');
    await digitar(tela, 'Buscar', 'an');
    await digitar(tela, 'Buscar', 'ana');
    await esperar(ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS);
    await assentar();
    expect(cliente.chamadasDeUsuarios().map((p) => p.get('busca'))).toEqual([null, 'ana']);
  });

  it('teclas mais rápidas que o atraso viram uma única chamada com a busca final', async () => {
    const { cliente, tela } = await montar();
    const intervaloEntreTeclas = ATRASO_DA_BUSCA_EM_MS / 3;
    for (const texto of ['a', 'an', 'ana', 'ana ', 'ana s']) {
      await digitar(tela, 'Buscar', texto);
      await esperar(intervaloEntreTeclas);
    }
    await esperar(ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS);
    await assentar();
    expect(cliente.chamadasDeUsuarios().map((p) => p.get('busca'))).toEqual([null, 'ana s']);
  });

  it('o campo de busca limita o texto ao máximo aceito pelo contrato', async () => {
    const { tela } = await montar();
    expect(campoPorRotulo<HTMLInputElement>(tela, 'Buscar').maxLength).toBe(200);
  });

  it('item repetido entre páginas aparece uma vez, pela primeira ocorrência', async () => {
    const { tela } = await montar({
      usuarios: (parametros) =>
        parametros.get('depois') === 'c1'
          ? pagina([usuarioListado({ nome: 'Maria Repetida' }), usuarioListado({ id: 'u-3' as never, nome: 'Zélia Costa' })])
          : pagina([usuarioListado()], 'c1'),
    });
    await tela.clicar('Carregar mais');
    const linhas = Array.from(tela.container.querySelectorAll('ul[aria-label="Usuários"] > li'));
    expect(linhas).toHaveLength(2);
    expect(linhas[0]?.textContent).toContain('Maria das Graças');
    expect(tela.texto()).not.toContain('Maria Repetida');
    expect(tela.texto()).toContain('Zélia Costa');
  });

  it('vazio só com a busca filtrando fala em filtros e não em lista vazia', async () => {
    const { tela } = await montar({
      usuarios: (parametros) => (parametros.get('busca') ? pagina([]) : pagina([usuarioListado()])),
    });
    await digitar(tela, 'Buscar', 'ninguém');
    await esperar(ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS);
    await assentar();
    expect(tela.texto()).toContain('combina com os filtros');
    expect(tela.texto()).not.toContain('Ainda não há usuários');
  });

  it('carregando mostra o esqueleto e nenhuma linha', async () => {
    const nunca = new Promise<never>(() => undefined);
    const { tela } = await montar({ usuarios: () => nunca });
    expect(tela.container.querySelector('style')?.textContent).toContain('cdd-sh');
    expect(tela.container.querySelector('ul[aria-label="Usuários"]')).toBeNull();
    expect(tela.texto()).not.toContain('Nenhum usuário encontrado');
  });

  it('erro mostra a mensagem e Tentar de novo busca outra vez', async () => {
    let falhar = true;
    const { cliente, tela } = await montar({
      usuarios: () => (falhar ? erroDeServidor() : pagina([usuarioListado()])),
    });
    expect(tela.texto()).toContain('Não deu para carregar');
    expect(tela.texto()).toContain('Não foi possível carregar os usuários');
    expect(tela.texto()).not.toContain('Maria das Graças');
    falhar = false;
    await tela.clicar('Tentar de novo');
    expect(cliente.chamadasDeUsuarios()).toHaveLength(2);
    expect(tela.texto()).toContain('Maria das Graças');
    expect(tela.texto()).not.toContain('Não deu para carregar');
  });

  it('vazio sem filtro explica que ainda não há usuários', async () => {
    const { tela } = await montar({ usuarios: () => pagina([]) });
    expect(tela.texto()).toContain('Nenhum usuário encontrado');
    expect(tela.texto()).toContain('Ainda não há usuários');
  });

  it('vazio com filtro pede para ajustar os filtros', async () => {
    const { tela } = await montar({
      usuarios: (parametros) => (parametros.get('situacao') ? pagina([]) : pagina([usuarioListado()])),
    });
    await escolher(tela, 'Situação', 'REVOGADO');
    await assentar();
    expect(tela.texto()).toContain('Nenhum usuário encontrado');
    expect(tela.texto()).toContain('combina com os filtros');
    expect(tela.texto()).not.toContain('Ainda não há usuários');
  });
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
