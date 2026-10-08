import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrupoId, Permissao } from '@cdd/contracts';
import { criarEntradaFalsa, criarEu, montarComSessao } from '../../app/apoioDeTeste';
import type { TelaMontada } from '../../app/apoioDeTeste';
import { MeuPerfilPage } from './MeuPerfilPage';
import { agruparPermissoes } from './permissoesAgrupadas';

const montadas: TelaMontada[] = [];

async function montarPerfil(eu = criarEu()) {
  const tela = await montarComSessao(
    { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(eu) },
    <MeuPerfilPage />,
  );
  montadas.push(tela);
  return tela;
}

afterEach(async () => {
  while (montadas.length > 0) await montadas.pop()?.desmontar();
  vi.unstubAllEnvs();
});

describe('Meu perfil', () => {
  it('mostra nome, e-mail, instituição e grupos do /eu', async () => {
    const tela = await montarPerfil(
      criarEu({
        grupos: [
          { id: 'g-1' as GrupoId, nome: 'Tesouraria' },
          { id: 'g-2' as GrupoId, nome: 'Guardião' },
        ],
      }),
    );
    const texto = tela.texto();
    expect(texto).toContain('Ana Souza');
    expect(texto).toContain('ana@cdd.local');
    expect(texto).toContain('Céu do Despertar');
    expect(texto).toContain('Tesouraria, Guardião');
  });

  it('lista permissões com descrição do catálogo, agrupadas por módulo, com o código', async () => {
    const tela = await montarPerfil(
      criarEu({
        permissoes: [
          'financeiro.lancamento.registrar',
          'eventos.evento.criar',
          'financeiro.conta.ler',
        ] as Permissao[],
      }),
    );
    const financeiro = tela.container.querySelector('section[aria-label="Permissões de financeiro"]');
    const eventos = tela.container.querySelector('section[aria-label="Permissões de eventos"]');
    expect(financeiro?.textContent).toContain('Registrar lançamento');
    expect(financeiro?.textContent).toContain('financeiro.lancamento.registrar');
    expect(financeiro?.textContent).toContain('Ler contas e saldos');
    expect(financeiro?.textContent).not.toContain('Criar evento');
    expect(eventos?.textContent).toContain('Criar evento');
    expect(eventos?.textContent).toContain('eventos.evento.criar');
  });

  it('código fora do catálogo aparece cru', async () => {
    const tela = await montarPerfil(criarEu({ permissoes: ['modulo.inventado.agir' as Permissao] }));
    const secao = tela.container.querySelector('section[aria-label="Permissões de outras"]');
    expect(secao?.textContent).toBe('outrasmodulo.inventado.agir');
  });

  it('sem permissões mostra o vazio', async () => {
    const tela = await montarPerfil(criarEu({ permissoes: [] }));
    expect(tela.texto()).toContain('Nenhuma permissão concedida');
  });

  it('não mostra mais a aba anamnese nem dados pessoais editáveis', async () => {
    const tela = await montarPerfil();
    expect(tela.texto()).not.toContain('Minha anamnese');
    expect(tela.texto()).not.toContain('Aparelhos');
    expect(tela.container.querySelectorAll('input').length).toBe(0);
  });

  it('o botão sair encerra a sessão', async () => {
    const entrada = criarEntradaFalsa(true);
    const tela = await montarComSessao(
      { entrada, buscarEu: () => Promise.resolve(criarEu()) },
      <MeuPerfilPage />,
    );
    montadas.push(tela);
    await tela.clicar('Sair');
    expect(entrada.sair).toHaveBeenCalled();
  });

  it('sem grupos mostra Nenhum grupo', async () => {
    const tela = await montarPerfil(criarEu({ grupos: [] }));
    expect(tela.texto()).toContain('Nenhum grupo');
  });
});

describe('agruparPermissoes', () => {
  it.each(['constructor', 'toString', '__proto__'])(
    'código %s herdado de Object cai em outras sem descrição',
    (codigo) => {
      const grupos = agruparPermissoes([codigo as Permissao]);
      expect(grupos).toEqual([{ modulo: 'outras', permissoes: [{ codigo, descricao: null }] }]);
    },
  );

  describe('com propriedades herdadas de Object.prototype', () => {
    beforeEach(() => {
      Object.defineProperty(Object.prototype, 'modulo', { value: 'herdado', configurable: true });
      Object.defineProperty(Object.prototype, 'descricao', { value: 'herdada', configurable: true });
    });

    afterEach(() => {
      Reflect.deleteProperty(Object.prototype, 'modulo');
      Reflect.deleteProperty(Object.prototype, 'descricao');
    });

    it('código herdado não pega módulo nem descrição de fora do catálogo', () => {
      const grupos = agruparPermissoes(['constructor' as Permissao]);
      expect(grupos).toEqual([{ modulo: 'outras', permissoes: [{ codigo: 'constructor', descricao: null }] }]);
    });
  });
});
