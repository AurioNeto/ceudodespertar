import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TEXTO_DA_FAIXA_DE_DEMONSTRACAO } from '../ds';
import { Layout } from './Layout';
import { ROTAS, type RotaId } from './navegacao';
import { PERMISSOES, type Permissao } from '@cdd/contracts';
import { TELAS, type RegistroDeTelas } from './telas';
import { criarEntradaFalsa, criarEu, montarComSessao, type TelaMontada } from './apoioDeTeste';

const ROTAS_DO_SHELL = Object.entries(ROTAS) as [RotaId, string][];

const todasComFonte = (fonte: 'mock' | 'api'): RegistroDeTelas =>
  Object.fromEntries(ROTAS_DO_SHELL.map(([id]) => [id, { fonte, acesso: [] as readonly Permissao[] }])) as RegistroDeTelas;

const telasComUmaApi = (id: RotaId): RegistroDeTelas => ({ ...todasComFonte('mock'), [id]: { fonte: 'api', acesso: [] } });

const telaAtiva: TelaMontada[] = [];

async function montarLayoutEm(
  caminho: string,
  telas: RegistroDeTelas,
  permissoes: readonly Permissao[] = PERMISSOES,
): Promise<TelaMontada> {
  const tela = await montarComSessao(
    { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu({ permissoes: [...permissoes] })) },
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route element={<Layout telas={telas} />}>
          <Route path="*" element={<p>conteudo-da-tela</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  telaAtiva.push(tela);
  return tela;
}

const faixas = (tela: TelaMontada) => tela.container.querySelectorAll('[role="note"]');

const simularCampo = (): (() => void) => {
  const original = window.matchMedia;
  window.matchMedia = ((consulta: string) => ({
    media: consulta,
    matches: true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
};

beforeEach(() => {
  vi.stubEnv('VITE_SESSAO_DE_DEMONSTRACAO', '');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const tela of telaAtiva.splice(0)) await tela.desmontar();
});

describe('faixa de demonstração no Layout', () => {
  it('o registro cobre exatamente as rotas do shell', () => {
    expect(Object.keys(TELAS).sort()).toEqual(Object.keys(ROTAS).sort());
  });

  it.each(ROTAS_DO_SHELL)('tela %s: faixa conforme a fonte registrada', async (id, caminho) => {
    const fonteReal = TELAS[id].fonte;

    const real = await montarLayoutEm(caminho, TELAS);
    expect(faixas(real).length).toBe(fonteReal === 'mock' ? 1 : 0);
    expect(real.texto()).toContain('conteudo-da-tela');

    const simuladaComoApi = await montarLayoutEm(caminho, telasComUmaApi(id));
    expect(faixas(simuladaComoApi).length).toBe(0);

    const simuladaComoMock = await montarLayoutEm(caminho, todasComFonte('mock'));
    expect(faixas(simuladaComoMock).length).toBe(1);
  });

  it('tela api não leva faixa nem em outra rota com fonte mock', async () => {
    const telas = telasComUmaApi('perfil');
    expect(faixas(await montarLayoutEm(ROTAS.perfil, telas)).length).toBe(0);
    expect(faixas(await montarLayoutEm(ROTAS.painel, telas)).length).toBe(1);
  });

  it.each(ROTAS_DO_SHELL)('com a sessão de demonstração, %s mostra a faixa mesmo sendo api', async (_id, caminho) => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_SESSAO_DE_DEMONSTRACAO', '1');
    const tela = await montarLayoutEm(caminho, todasComFonte('api'));
    expect(faixas(tela).length).toBe(1);
  });

  it('sem DEV a flag da demonstração não liga a faixa', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SESSAO_DE_DEMONSTRACAO', '1');
    const tela = await montarLayoutEm(ROTAS.perfil, todasComFonte('api'));
    expect(faixas(tela).length).toBe(0);
  });

  it('a faixa é uma nota com o texto exato', async () => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS);
    const faixa = tela.container.querySelector('[role="note"]');
    expect(faixa?.textContent).toBe(
      'Dados de demonstração. Esta tela ainda não está ligada ao sistema: o que aparece aqui é exemplo e nada é gravado.',
    );
    expect(TEXTO_DA_FAIXA_DE_DEMONSTRACAO).toBe(faixa?.textContent);
  });
});

describe('acesso por permissão no Layout', () => {
  const REGISTRO: readonly Permissao[] = [
    'financeiro.lancamento.registrar',
    'financeiro.lancamento.ler_proprios',
    'financeiro.plano_contas.ler',
    'estoque.movimento.registrar',
  ];

  const itensDoMenu = (tela: TelaMontada) =>
    Array.from(tela.container.querySelectorAll('nav button')).map((b) => b.textContent ?? '');

  it('o grupo REGISTRO vê só Painel, Registrar lançamento e Meus registros no menu', async () => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS, REGISTRO);
    const texto = itensDoMenu(tela).join('|');
    expect(texto).toContain('Painel');
    expect(texto).toContain('Registrar lançamento');
    expect(texto).toContain('Meus registros');
    expect(texto).not.toContain('Verificação de lote');
    for (const secao of ['Financeiro', 'Cerimônias', 'Pessoas', 'Sistema']) {
      expect(tela.container.querySelector('aside nav')?.textContent).not.toContain(secao);
    }
  });

  it.each([
    ['sistema.usuario.gerenciar'],
    ['sistema.grupo.gerenciar'],
  ] as const)('quem tem %s vê Acessos na seção Sistema, antes de Auditoria', async (permissao) => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS, [permissao, 'sistema.auditoria.ler']);
    const menu = tela.container.querySelector('aside nav')?.textContent ?? '';
    expect(menu).toContain('Sistema');
    expect(menu.indexOf('Sistema')).toBeLessThan(menu.indexOf('Acessos'));
    expect(menu.indexOf('Acessos')).toBeLessThan(menu.indexOf('Auditoria'));
  });

  it('quem não tem permissão de acessos não vê o item no menu', async () => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS, REGISTRO);
    expect(itensDoMenu(tela).join('|')).not.toContain('Acessos');
  });

  it('a rota de acessos não leva a faixa de demonstração', async () => {
    const tela = await montarLayoutEm(ROTAS.acessos, TELAS, ['sistema.usuario.gerenciar']);
    expect(faixas(tela).length).toBe(0);
    expect(tela.texto()).toContain('conteudo-da-tela');
  });

  it('link direto sem permissão mostra o PermissionDenied, sem faixa e sem a tela', async () => {
    const tela = await montarLayoutEm(ROTAS.lote, TELAS, REGISTRO);
    expect(tela.texto()).toContain('Você não tem acesso a Verificação de lote');
    expect(tela.texto()).toContain('financeiro.lancamento.confirmar');
    expect(tela.texto()).toContain('Tesouraria');
    expect(tela.texto()).toContain('o administrador');
    expect(faixas(tela).length).toBe(0);
    expect(tela.texto()).not.toContain('conteudo-da-tela');
  });

  it('tela com várias permissões é liberada por qualquer uma delas', async () => {
    const tela = await montarLayoutEm(ROTAS.relatorios, TELAS, ['financeiro.dre.ler']);
    expect(tela.texto()).toContain('conteudo-da-tela');
    expect(tela.texto()).not.toContain('Você não tem acesso');
  });

  it('tela bloqueada com várias permissões cita a primeira da lista', async () => {
    const tela = await montarLayoutEm(ROTAS.relatorios, TELAS, REGISTRO);
    expect(tela.texto()).toContain('Você não tem acesso a Relatórios');
    expect(tela.texto()).toContain('financeiro.dre.ler');
    expect(tela.texto()).not.toContain('financeiro.resultado_evento.ler');
  });
});

describe('AppShell dentro do Layout', () => {
  const restaurar: (() => void)[] = [];

  afterEach(() => {
    for (const desfazer of restaurar.splice(0)) desfazer();
  });

  const lateral = (tela: TelaMontada) => tela.container.querySelector('aside');
  const barraDeContexto = (tela: TelaMontada) => tela.container.querySelector('header');
  const chip = (tela: TelaMontada) => tela.container.querySelector('button[title="Meu perfil"]');
  const botaoDoMenu = (tela: TelaMontada) =>
    Array.from(tela.container.querySelectorAll<HTMLButtonElement>('nav button')).find(
      (botao) => botao.textContent === 'Menu',
    );
  const perfilNoMenu = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] nav button')).find((botao) =>
      botao.textContent?.includes('Meu perfil'),
    );

  it('passa à casca os textos da casa: marca, legenda, instituição, unidade e o nome do perfil', async () => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS);
    expect(lateral(tela)?.textContent).toContain('Céu doDespertar');
    expect(lateral(tela)?.textContent).toContain('Sistema de gestão');
    expect(barraDeContexto(tela)?.textContent).toContain('Céu do Despertar');
    expect(barraDeContexto(tela)?.textContent).toContain('CDD');
    expect(chip(tela)).not.toBeNull();
  });

  it('em escritório só na página do perfil o chip do usuário é a página atual', async () => {
    const noPerfil = await montarLayoutEm(ROTAS.perfil, TELAS);
    expect(chip(noPerfil)?.getAttribute('aria-current')).toBe('page');
    const noPainel = await montarLayoutEm(ROTAS.painel, TELAS);
    expect(chip(noPainel)?.hasAttribute('aria-current')).toBe(false);
  });

  it('em campo, na página do perfil o Menu é realçado e o Meu perfil do menu é a página atual', async () => {
    restaurar.push(simularCampo());
    const tela = await montarLayoutEm(ROTAS.perfil, TELAS);
    expect(botaoDoMenu(tela)?.style.color).toBe('var(--color-royal)');
    await tela.clicar('Menu');
    expect(perfilNoMenu()?.getAttribute('aria-current')).toBe('page');
  });

  it('em campo, nas outras páginas o Menu não é realçado por causa do perfil e o Meu perfil não é a página atual', async () => {
    restaurar.push(simularCampo());
    const tela = await montarLayoutEm(ROTAS.painel, TELAS);
    expect(botaoDoMenu(tela)?.style.color).toBe('var(--text-secondary)');
    await tela.clicar('Menu');
    expect(perfilNoMenu()?.hasAttribute('aria-current')).toBe(false);
  });
});
