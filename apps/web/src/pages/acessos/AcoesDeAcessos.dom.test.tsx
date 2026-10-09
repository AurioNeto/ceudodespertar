import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import type { GrupoId, PedidoDeConvite, UsuarioConvidado, UsuarioId } from '@cdd/contracts';
import { assentar, type TelaMontada } from '../../app/apoioDeTeste';
import { ErroDaApi, ErroDeRede } from '../../dados/erros';
import {
  PERMISSAO_DE_USUARIOS,
  abrirPeloGatilho,
  alternarGrupoNoPainel,
  botaoDeFora,
  botaoDoPainel,
  clicarNoPainel,
  criarClienteFalso,
  digitarNoPainel,
  grupoDaGestao,
  montarAcessos,
  pagina,
  painelAberto,
  simularCelular,
  textoDoPainel,
  usuarioListado,
} from './apoioDeTeste';
import type { RoteiroDoCliente } from './apoioDeTeste';
import { CONVITE_REGISTRADO } from './textosDeAcessos';

const montadas: TelaMontada[] = [];
const restauracoes: Array<() => void> = [];

const GRUPO_TESOURARIA = grupoDaGestao();
const GRUPO_SECRETARIA = grupoDaGestao({ id: 'g-2' as GrupoId, codigoSistema: null, nome: 'Secretaria' });

const convidado = (): UsuarioConvidado => {
  const { ultimoAcessoEm: _ultimoAcessoEm, ...resto } = usuarioListado({
    id: 'u-9' as UsuarioId,
    nome: 'Ana Souza',
    email: 'ana@cdd.local',
    situacao: 'CONVITE_PENDENTE',
  });
  return resto;
};

function roteiro(sobrescritas: Partial<RoteiroDoCliente> = {}): RoteiroDoCliente {
  return {
    usuarios: () => pagina([usuarioListado()]),
    grupos: () => ({ itens: [GRUPO_TESOURARIA, GRUPO_SECRETARIA] }),
    comando: () => convidado(),
    ...sobrescritas,
  };
}

async function montar(sobrescritas: Partial<RoteiroDoCliente> = {}, permissoes = [PERMISSAO_DE_USUARIOS]) {
  const cliente = criarClienteFalso(roteiro(sobrescritas));
  const tela = await montarAcessos(cliente, permissoes);
  montadas.push(tela);
  return { cliente, tela };
}

async function abrirConvite(tela: TelaMontada) {
  await abrirPeloGatilho(botaoDeFora(tela, 'Convidar'));
}

async function preencherConvite(nome = 'Ana Souza', email = 'Ana@CDD.local') {
  await digitarNoPainel('Nome', nome);
  await digitarNoPainel('E-mail', email);
}

afterEach(async () => {
  while (montadas.length > 0) await montadas.pop()?.desmontar();
  while (restauracoes.length > 0) restauracoes.pop()?.();
});

describe('Acessos: convidar', () => {
  it('só mostra Convidar para quem pode gerenciar usuários', async () => {
    const { tela } = await montar({}, ['sistema.grupo.gerenciar']);
    expect(tela.texto()).not.toContain('Convidar');
  });

  it('com grupos escolhidos envia nome, e-mail em minúsculo e grupos, confirma e atualiza a lista', async () => {
    let leituras = 0;
    const { cliente, tela } = await montar({
      usuarios: () => pagina(++leituras === 1 ? [usuarioListado()] : [usuarioListado(), usuarioListado({ id: 'u-9' as UsuarioId, nome: 'Ana Souza' })]),
    });
    await abrirConvite(tela);
    await preencherConvite();
    await alternarGrupoNoPainel('Tesouraria');
    await alternarGrupoNoPainel('Secretaria');
    await clicarNoPainel('Registrar convite');

    const [chamada] = cliente.chamadasDeComando();
    expect(chamada).toMatchObject({ metodo: 'POST', caminho: '/identidade/usuarios' });
    expect(chamada?.corpo).toEqual({ nome: 'Ana Souza', email: 'ana@cdd.local', grupos: ['g-1', 'g-2'] });
    expect(textoDoPainel()).toContain(CONVITE_REGISTRADO);
    expect(textoDoPainel()).not.toMatch(/e-mail enviado|enviamos/i);
    expect(textoDoPainel()).not.toContain('Reenviar convite');
    expect(tela.container.querySelectorAll('ul[aria-label="Usuários"] > li')).toHaveLength(2);
  });

  it('sem grupos não envia o campo grupos e explica que a pessoa entra com acesso de leitura', async () => {
    const { cliente, tela } = await montar();
    await abrirConvite(tela);
    expect(textoDoPainel()).toContain('acesso de leitura');
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    const corpo = cliente.chamadasDeComando()[0]?.corpo as PedidoDeConvite;
    expect(corpo).toEqual({ nome: 'Ana Souza', email: 'ana@cdd.local' });
    expect(corpo).not.toHaveProperty('grupos');
  });

  it('valida nome e e-mail antes de enviar', async () => {
    const { cliente, tela } = await montar();
    await abrirConvite(tela);
    await clicarNoPainel('Registrar convite');
    expect(textoDoPainel()).toContain('Informe o nome.');
    expect(textoDoPainel()).toContain('Informe um e-mail válido.');
    expect(cliente.chamadasDeComando()).toHaveLength(0);
  });

  it('EMAIL_JA_CADASTRADO aparece no painel, que continua aberto com os campos preenchidos', async () => {
    const { tela } = await montar({
      comando: () => new ErroDaApi({ status: 409, codigo: 'EMAIL_JA_CADASTRADO' }),
    });
    await abrirConvite(tela);
    await preencherConvite();
    await alternarGrupoNoPainel('Tesouraria');
    await clicarNoPainel('Registrar convite');

    expect(painelAberto()?.querySelector('[role="alert"]')?.textContent).toContain('Já existe um usuário com este e-mail');
    expect(painelAberto()?.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe('Ana@CDD.local');
    expect(painelAberto()?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  });

  it('reenvio do mesmo conteúdo após erro de rede usa a mesma Idempotency-Key', async () => {
    let tentativa = 0;
    const { cliente, tela } = await montar({
      comando: () => (++tentativa === 1 ? new ErroDeRede(new TypeError('fetch failed')) : convidado()),
    });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    expect(painelAberto()?.querySelector('[role="alert"]')?.textContent).toContain('Sem conexão');
    await clicarNoPainel('Registrar convite');

    const [primeira, segunda] = cliente.chamadasDeComando();
    expect(primeira?.chaveDeIdempotencia).toBeTruthy();
    expect(segunda?.chaveDeIdempotencia).toBe(primeira?.chaveDeIdempotencia);
  });

  it('alterar o conteúdo depois de um erro de rede gera Idempotency-Key nova', async () => {
    const { cliente, tela } = await montar({ comando: () => new ErroDeRede(new TypeError('fetch failed')) });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    await digitarNoPainel('Nome', 'Ana S.');
    await clicarNoPainel('Registrar convite');
    const [antes, depois] = cliente.chamadasDeComando();
    expect(depois?.chaveDeIdempotencia).not.toBe(antes?.chaveDeIdempotencia);
  });

  it('não aceita envio duplo enquanto o primeiro está em andamento', async () => {
    let liberar: (valor: UsuarioConvidado) => void = () => undefined;
    const { cliente, tela } = await montar({
      comando: () => new Promise<UsuarioConvidado>((resolver) => (liberar = resolver)),
    });
    await abrirConvite(tela);
    await preencherConvite();
    const botao = botaoDoPainel('Registrar convite');
    await act(async () => {
      botao.click();
      botao.click();
    });
    expect(cliente.chamadasDeComando()).toHaveLength(1);
    expect(botaoDoPainel('Enviando…').getAttribute('aria-disabled')).toBe('true');
    await act(async () => liberar(convidado()));
    await assentar();
    expect(textoDoPainel()).toContain(CONVITE_REGISTRADO);
  });

  it('Esc fecha o painel e devolve o foco ao botão Convidar', async () => {
    const { tela } = await montar();
    const gatilho = botaoDeFora(tela, 'Convidar');
    await abrirPeloGatilho(gatilho);
    expect(painelAberto()).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(painelAberto()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('abre lateral no desktop', async () => {
    const { tela } = await montar();
    await abrirConvite(tela);
    expect(painelAberto()?.dataset.variante).toBe('lateral');
  });

  it('abre em folha no celular', async () => {
    restauracoes.push(simularCelular());
    const { tela } = await montar();
    await abrirConvite(tela);
    expect(painelAberto()?.dataset.variante).toBe('folha');
  });
});
