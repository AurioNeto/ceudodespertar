import { expect, it } from 'vitest';
import { montarCadastro } from '@/testes/cadastroDaApi';
import { botaoComTexto, clicar, digitar, elemento } from '@/testes/montagem';
import { assentar } from '@/testes/sessaoDeTeste';
import { PessoasPage } from './PessoasPage';

const pessoa = { id: 'p1', nome: 'Ana', tipo: 'FISICA', documento: null, ativa: true, versao: 3 };

it('pagina a consulta e não exibe ações para quem só pode ler', async () => {
  const tela = await montarCadastro(<PessoasPage />, ['pessoas.pessoa.ler'], caminho =>
    Response.json(caminho.includes('depois=cursor') ? { itens: [{ ...pessoa, id: 'p2', nome: 'Bia' }], proxima: null }
      : { itens: [pessoa], proxima: 'cursor' }));
  try {
    expect(tela.texto()).toContain('Ana');
    expect(tela.texto()).not.toContain('Adicionar pessoa');
    expect(tela.texto()).not.toContain('Editar');
    await tela.clicar('Carregar mais');
    expect(tela.texto()).toContain('Bia');
    expect(tela.fetch.mock.calls.map(([caminho]) => caminho)).toEqual(['/api/v1/pessoas', '/api/v1/pessoas?depois=cursor']);
  } finally {
    await tela.desmontar();
  }
});

it('edita com a versão lida e atualiza a lista após salvar', async () => {
  let registro = pessoa;
  const tela = await montarCadastro(<PessoasPage />, ['pessoas.pessoa.ler', 'pessoas.pessoa.editar'], (_caminho, requisicao) => {
    if (requisicao?.method === 'PUT') {
      registro = { ...pessoa, ...JSON.parse(String(requisicao.body)), versao: 4 };
      return Response.json(registro);
    }
    return Response.json({ itens: [registro], proxima: null });
  });
  try {
    await tela.clicar('Editar');
    const painel = elemento(document, '[role="dialog"]');
    await digitar(elemento<HTMLInputElement>(painel, 'input'), 'Ana Maria');
    await clicar(botaoComTexto(painel, 'Salvar'));
    await assentar();
    const chamada = tela.fetch.mock.calls.find(([, requisicao]) => requisicao?.method === 'PUT');
    expect(chamada?.[0]).toBe('/api/v1/pessoas/p1');
    expect(new Headers(chamada?.[1]?.headers).get('If-Match')).toBe('3');
    expect(tela.texto()).toContain('Ana Maria');
  } finally {
    await tela.desmontar();
  }
});
