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
  campoDoPainel,
  clicarNoPainel,
  criarClienteFalso,
  digitarNoPainel,
  grupoDaGestao,
  gruposMarcadosNoPainel,
  montarAcessos,
  pagina,
  painelAberto,
  simularCelular,
  textoDoPainel,
  usuarioListado,
} from './apoioDeTeste';
import type { RoteiroDoCliente } from './apoioDeTeste';
import { AVISO_DE_VERSAO_DESATUALIZADA, AVISO_LGPD_DO_MOTIVO, CONVITE_REGISTRADO } from './textosDeAcessos';

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

const USUARIO_ATIVO = usuarioListado();
const USUARIO_SUSPENSO = usuarioListado({ situacao: 'SUSPENSO', versao: 3 });

const gatilhoDe = (tela: TelaMontada, nome = 'Maria das Graças'): HTMLButtonElement => {
  const gatilho = tela.container.querySelector<HTMLButtonElement>(`button[aria-label="Gerenciar acesso de ${nome}"]`);
  if (!gatilho) throw new Error('gatilho não encontrado');
  return gatilho;
};

async function abrirGerenciar(tela: TelaMontada) {
  await abrirPeloGatilho(gatilhoDe(tela));
}

const situacaoAlterada = (situacao: 'ATIVO' | 'SUSPENSO', versao: number) => ({ situacao, versao });

describe('Acessos: gerenciar usuário', () => {
  it('o gatilho da linha é um botão nomeado que anuncia um diálogo e abre o painel do usuário', async () => {
    const { tela } = await montar();
    const gatilho = gatilhoDe(tela);
    expect(gatilho.getAttribute('aria-haspopup')).toBe('dialog');
    await abrirGerenciar(tela);
    expect(painelAberto()?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(textoDoPainel()).toContain('Gerenciar Maria das Graças');
    expect(gruposMarcadosNoPainel()).toEqual(['Tesouraria']);
  });

  it('troca de grupos envia PUT com If-Match da versão, fecha o painel, devolve o foco e atualiza a lista', async () => {
    let leituras = 0;
    const { cliente, tela } = await montar({
      usuarios: () =>
        pagina(
          ++leituras === 1
            ? [USUARIO_ATIVO]
            : [usuarioListado({ versao: 2, grupos: [{ id: 'g-2' as GrupoId, nome: 'Secretaria' }] })],
        ),
      comando: () => ({ grupos: [{ id: 'g-2', nome: 'Secretaria' }], versao: 2 }),
    });
    const gatilho = gatilhoDe(tela);
    await abrirGerenciar(tela);
    await alternarGrupoNoPainel('Tesouraria');
    await alternarGrupoNoPainel('Secretaria');
    await clicarNoPainel('Salvar grupos');

    const [chamada] = cliente.chamadasDeComando();
    expect(chamada).toMatchObject({ metodo: 'PUT', caminho: '/identidade/usuarios/u-1/grupos', versao: 1 });
    expect(chamada?.corpo).toEqual({ grupos: ['g-2'] });
    expect(painelAberto()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
    expect(tela.container.querySelector('ul[aria-label="Grupos de Maria das Graças"]')?.textContent).toBe('Secretaria');
  });

  it('usuário REVOGADO só tem os grupos para leitura e nenhuma ação de situação', async () => {
    const { cliente, tela } = await montar({ usuarios: () => pagina([usuarioListado({ situacao: 'REVOGADO' })]) });
    await abrirGerenciar(tela);
    const caixas = Array.from(painelAberto()?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? []);
    expect(caixas.length).toBeGreaterThan(0);
    expect(caixas.every((c) => c.closest('fieldset')?.disabled)).toBe(true);
    expect(textoDoPainel()).not.toContain('Salvar grupos');
    expect(textoDoPainel()).not.toContain('Suspender acesso');
    expect(textoDoPainel()).not.toContain('Reativar acesso');
    expect(cliente.chamadasDeComando()).toHaveLength(0);
  });

  it('só oferece suspender para ATIVO, só reativar para SUSPENSO e nenhuma das duas para convite pendente', async () => {
    const oferecidas = async (usuario: typeof USUARIO_ATIVO) => {
      const { tela } = await montar({ usuarios: () => pagina([usuario]) });
      await abrirGerenciar(tela);
      const texto = textoDoPainel();
      await tela.desmontar();
      montadas.pop();
      return [texto.includes('Suspender acesso'), texto.includes('Reativar acesso')];
    };
    expect(await oferecidas(USUARIO_ATIVO)).toEqual([true, false]);
    expect(await oferecidas(USUARIO_SUSPENSO)).toEqual([false, true]);
    expect(await oferecidas(usuarioListado({ situacao: 'CONVITE_PENDENTE' }))).toEqual([false, false]);
  });

  it('nunca oferece Revogar nem Reenviar convite', async () => {
    const { tela } = await montar({ usuarios: () => pagina([USUARIO_ATIVO, usuarioListado({ id: 'u-2' as UsuarioId, nome: 'João', situacao: 'CONVITE_PENDENTE' })]) });
    await abrirPeloGatilho(gatilhoDe(tela, 'João'));
    for (const texto of [tela.texto(), textoDoPainel()]) {
      expect(texto).not.toMatch(/revogar/i);
      expect(texto).not.toMatch(/reenviar convite/i);
    }
  });

  it('suspender mostra o aviso LGPD exato ligado ao campo, conta até 500 e envia o motivo aparado', async () => {
    const { cliente, tela } = await montar({ comando: () => situacaoAlterada('SUSPENSO', 2) });
    await abrirGerenciar(tela);
    const campo = campoDoPainel<HTMLTextAreaElement>('Motivo');
    const [idDoAviso, idDoContador] = (campo.getAttribute('aria-describedby') ?? '').split(' ');
    expect(document.getElementById(idDoAviso ?? '')?.textContent).toBe(AVISO_LGPD_DO_MOTIVO);
    expect(document.getElementById(idDoContador ?? '')?.textContent).toBe('0/500');
    expect(campo.maxLength).toBe(500);
    expect(textoDoPainel()).toContain('0/500');
    await digitarNoPainel('Motivo', '  deixou a tesouraria  ');
    expect(textoDoPainel()).toContain('23/500');
    await digitarNoPainel('Motivo', 'x'.repeat(500));
    expect(textoDoPainel()).toContain('500/500');
    await digitarNoPainel('Motivo', '  deixou a tesouraria  ');
    await clicarNoPainel('Suspender acesso');

    const [chamada] = cliente.chamadasDeComando();
    expect(chamada).toMatchObject({ metodo: 'POST', caminho: '/identidade/usuarios/u-1/desativar', versao: 1 });
    expect(chamada?.corpo).toEqual({ motivo: 'deixou a tesouraria' });
    expect(chamada?.chaveDeIdempotencia).toBeTruthy();
    expect(painelAberto()).toBeNull();
  });

  it('reativar usa o mesmo painel, com aviso LGPD, e faz POST em reativar', async () => {
    const { cliente, tela } = await montar({
      usuarios: () => pagina([USUARIO_SUSPENSO]),
      comando: () => situacaoAlterada('ATIVO', 4),
    });
    await abrirGerenciar(tela);
    expect(textoDoPainel()).toContain(AVISO_LGPD_DO_MOTIVO);
    await digitarNoPainel('Motivo', 'voltou à tesouraria');
    await clicarNoPainel('Reativar acesso');
    expect(cliente.chamadasDeComando()[0]).toMatchObject({
      caminho: '/identidade/usuarios/u-1/reativar',
      versao: 3,
      corpo: { motivo: 'voltou à tesouraria' },
    });
  });

  it('não envia sem motivo', async () => {
    const { cliente, tela } = await montar();
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', '   ');
    await clicarNoPainel('Suspender acesso');
    expect(textoDoPainel()).toContain('Informe o motivo.');
    expect(cliente.chamadasDeComando()).toHaveLength(0);
  });

  it('erro de rede seguido de novo clique reaproveita a Idempotency-Key; mudar o motivo gera outra', async () => {
    const { cliente, tela } = await montar({ comando: () => new ErroDeRede(new TypeError('fetch failed')) });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    await clicarNoPainel('Suspender acesso');
    await digitarNoPainel('Motivo', 'saiu da instituição');
    await clicarNoPainel('Suspender acesso');
    const [a, b, c] = cliente.chamadasDeComando().map((chamada) => chamada.chaveDeIdempotencia);
    expect(b).toBe(a);
    expect(c).not.toBe(a);
    expect(textoDoPainel()).toContain('Sem conexão');
  });

  it('ULTIMO_ADMINISTRADOR aparece no painel, que fica aberto com o motivo digitado', async () => {
    const { tela } = await montar({ comando: () => new ErroDaApi({ status: 409, codigo: 'ULTIMO_ADMINISTRADOR' }) });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    expect(painelAberto()?.querySelector('[role="alert"]')?.textContent).toContain('último administrador');
    expect(campoDoPainel<HTMLTextAreaElement>('Motivo').value).toBe('deixou a tesouraria');
  });

  it('409 recarrega o usuário por id, mantém o painel aberto com o estado novo e o motivo, avisa e não reenvia', async () => {
    const usuarioNovo = usuarioListado({
      situacao: 'SUSPENSO',
      versao: 2,
      grupos: [{ id: 'g-2' as GrupoId, nome: 'Secretaria' }],
    });
    const { cliente, tela } = await montar({
      usuario: () => usuarioNovo,
      comando: () => new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' }),
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await alternarGrupoNoPainel('Secretaria');
    await clicarNoPainel('Suspender acesso');

    expect(cliente.requisitar.mock.calls.map(([o]) => `${o.metodo} ${o.caminho}`)).toContain('GET /identidade/usuarios/u-1');
    expect(cliente.chamadasDeComando()).toHaveLength(1);
    expect(painelAberto()).not.toBeNull();
    expect(painelAberto()?.querySelector('[role="status"]')?.textContent).toBe(AVISO_DE_VERSAO_DESATUALIZADA);
    expect(textoDoPainel()).toContain('Reativar acesso');
    expect(textoDoPainel()).not.toContain('Suspender acesso');
    expect(campoDoPainel<HTMLTextAreaElement>('Motivo').value).toBe('deixou a tesouraria');
    expect(gruposMarcadosNoPainel()).toEqual(['Secretaria']);
  });

  it('depois do 409 o novo envio usa a versão recarregada e uma chave nova', async () => {
    let tentativa = 0;
    const { cliente, tela } = await montar({
      usuario: () => usuarioListado({ versao: 2 }),
      comando: () =>
        ++tentativa === 1 ? new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' }) : situacaoAlterada('SUSPENSO', 3),
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    await clicarNoPainel('Suspender acesso');
    const [primeira, segunda] = cliente.chamadasDeComando();
    expect(primeira?.versao).toBe(1);
    expect(segunda?.versao).toBe(2);
    expect(segunda?.chaveDeIdempotencia).not.toBe(primeira?.chaveDeIdempotencia);
    expect(painelAberto()).toBeNull();
  });

  it('Esc fecha o painel e devolve o foco ao gatilho da linha', async () => {
    const { tela } = await montar();
    const gatilho = gatilhoDe(tela);
    await abrirGerenciar(tela);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(painelAberto()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('se a linha some da lista, o foco vai para o título da tela', async () => {
    let leituras = 0;
    const { tela } = await montar({
      usuarios: () => pagina(++leituras === 1 ? [USUARIO_ATIVO] : []),
      comando: () => situacaoAlterada('SUSPENSO', 2),
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    expect(document.activeElement).toBe(tela.container.querySelector('h1'));
  });

  it('abre em folha no celular', async () => {
    restauracoes.push(simularCelular());
    const { tela } = await montar();
    await abrirGerenciar(tela);
    expect(painelAberto()?.dataset.variante).toBe('folha');
  });
});

const fundoDoPainel = () => document.querySelector<HTMLElement>('[data-testid="painel-de-acao-fundo"]');

const teclarEsc = () =>
  act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });

async function irParaAbaGrupos(tela: TelaMontada) {
  const aba = Array.from(tela.container.querySelectorAll<HTMLElement>('button, [role="radio"], [role="tab"]')).find(
    (el) => el.textContent === 'Grupos',
  );
  if (!aba) throw new Error('aba Grupos não encontrada');
  await act(async () => aba.click());
  await assentar();
}

const contagemDeUsuariosNaAbaGrupos = (tela: TelaMontada) =>
  tela.container.querySelector('article[aria-label="Grupo Tesouraria"]')?.textContent ?? '';

describe('Acessos: foco e leitor de tela no painel', () => {
  it('depois do convite o foco vai para Concluir e a região de status já existia vazia', async () => {
    const { tela } = await montar();
    await abrirConvite(tela);
    const status = painelAberto()?.querySelector('[role="status"]');
    expect(status?.textContent).toBe('');
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    expect(painelAberto()?.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent).toBe(CONVITE_REGISTRADO);
    expect(document.activeElement).toBe(botaoDoPainel('Concluir'));
  });

  it('erro de campo fica ligado ao campo por aria-describedby e aria-invalid', async () => {
    const { tela } = await montar();
    await abrirConvite(tela);
    await clicarNoPainel('Registrar convite');
    const campo = campoDoPainel<HTMLInputElement>('Nome');
    const ids = (campo.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain('Informe o nome.');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
  });

  it('erro de motivo convive com o aviso LGPD e o contador no aria-describedby', async () => {
    const { tela } = await montar();
    await abrirGerenciar(tela);
    await clicarNoPainel('Suspender acesso');
    const campo = campoDoPainel<HTMLTextAreaElement>('Motivo');
    const textos = (campo.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(textos).toEqual([AVISO_LGPD_DO_MOTIVO, '0/500', 'Informe o motivo.']);
  });

  it('o contador só é anunciado perto do limite', async () => {
    const { tela } = await montar();
    await abrirGerenciar(tela);
    const contador = () => painelAberto()?.querySelector('[aria-live]');
    expect(contador()?.getAttribute('aria-live')).toBe('off');
    await digitarNoPainel('Motivo', 'x'.repeat(449));
    expect(contador()?.getAttribute('aria-live')).toBe('off');
    await digitarNoPainel('Motivo', 'x'.repeat(450));
    expect(contador()?.getAttribute('aria-live')).toBe('polite');
  });

  it('e-mail sem domínio completo é recusado antes de enviar', async () => {
    const { cliente, tela } = await montar();
    await abrirConvite(tela);
    await preencherConvite('Ana Souza', 'a@b');
    await clicarNoPainel('Registrar convite');
    expect(textoDoPainel()).toContain('Informe um e-mail válido.');
    expect(cliente.chamadasDeComando()).toHaveLength(0);
  });
});

interface Adiado<T> {
  readonly promessa: Promise<T>;
  resolver(valor: T): void;
  rejeitar(erro: Error): void;
}

function adiar<T>(): Adiado<T> {
  let resolver: (valor: T) => void = () => undefined;
  let rejeitar: (erro: Error) => void = () => undefined;
  const promessa = new Promise<T>((aoResolver, aoRejeitar) => {
    resolver = aoResolver;
    rejeitar = aoRejeitar;
  });
  return { promessa, resolver, rejeitar };
}

const fecharPeloBotao = () =>
  act(async () => painelAberto()?.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')?.click());

const fecharPeloFundo = () => act(async () => fundoDoPainel()?.click());

const FORMAS_DE_FECHAR = [
  ['Esc', teclarEsc],
  ['fundo', fecharPeloFundo],
  ['Fechar', fecharPeloBotao],
] as const;

const OUTRO_USUARIO = usuarioListado({ id: 'u-2' as UsuarioId, nome: 'João Lima', email: 'joao@cdd.local' });

describe('Acessos: fechar durante o envio', () => {
  it.each(FORMAS_DE_FECHAR)('convite: %s fecha o painel mesmo com o envio em andamento', async (_forma, fechar) => {
    const envio = adiar<UsuarioConvidado>();
    const { tela } = await montar({ comando: () => envio.promessa });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    expect(botaoDoPainel('Enviando…').getAttribute('aria-disabled')).toBe('true');
    await fechar();
    expect(painelAberto()).toBeNull();
  });

  it('convite: sucesso tardio depois de fechar não reabre, mantém o painel novo limpo e atualiza a lista', async () => {
    const envio = adiar<UsuarioConvidado>();
    let leituras = 0;
    const { cliente, tela } = await montar({
      usuarios: () => pagina(++leituras === 1 ? [USUARIO_ATIVO] : [USUARIO_ATIVO, OUTRO_USUARIO]),
      comando: () => envio.promessa,
    });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    await teclarEsc();
    await act(async () => envio.resolver(convidado()));
    await assentar();

    expect(painelAberto()).toBeNull();
    expect(cliente.chamadasDeComando()).toHaveLength(1);
    expect(tela.container.querySelectorAll('ul[aria-label="Usuários"] > li')).toHaveLength(2);
    await abrirConvite(tela);
    expect(textoDoPainel()).not.toContain(CONVITE_REGISTRADO);
    expect(campoDoPainel<HTMLInputElement>('Nome').value).toBe('');
  });

  it('convite: erro tardio depois de fechar não reabre nem mostra o erro no painel seguinte', async () => {
    const envio = adiar<UsuarioConvidado>();
    const { cliente, tela } = await montar({ comando: () => envio.promessa });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    await teclarEsc();
    const leiturasAntes = cliente.chamadasDeUsuarios().length;
    await act(async () => envio.rejeitar(new ErroDaApi({ status: 409, codigo: 'EMAIL_JA_CADASTRADO' })));
    await assentar();

    expect(painelAberto()).toBeNull();
    expect(cliente.chamadasDeUsuarios()).toHaveLength(leiturasAntes);
    await abrirConvite(tela);
    expect(painelAberto()?.querySelector('[role="alert"]')).toBeNull();
  });

  it.each(FORMAS_DE_FECHAR)('gerenciar: %s fecha o painel mesmo com o envio em andamento', async (_forma, fechar) => {
    const envio = adiar<unknown>();
    const { tela } = await montar({ comando: () => envio.promessa });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    await fechar();
    expect(painelAberto()).toBeNull();
  });

  const DESFECHOS_TARDIOS = [
    ['sucesso', (envio: Adiado<unknown>) => envio.resolver(situacaoAlterada('SUSPENSO', 2)), true],
    ['erro', (envio: Adiado<unknown>) => envio.rejeitar(new ErroDaApi({ status: 422, codigo: 'ULTIMO_ADMINISTRADOR' })), false],
    ['409', (envio: Adiado<unknown>) => envio.rejeitar(new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' })), true],
  ] as const;

  it.each(DESFECHOS_TARDIOS)(
    'gerenciar: %s tardio depois de fechar e abrir outro usuário não fecha nem altera o painel aberto',
    async (_desfecho, desfecho, invalidaALista) => {
      const envio = adiar<unknown>();
      const { cliente, tela } = await montar({
        usuarios: () => pagina([USUARIO_ATIVO, OUTRO_USUARIO]),
        usuario: () => usuarioListado({ versao: 2, situacao: 'SUSPENSO' }),
        comando: () => envio.promessa,
      });
      await abrirGerenciar(tela);
      await digitarNoPainel('Motivo', 'deixou a tesouraria');
      await clicarNoPainel('Suspender acesso');
      await teclarEsc();
      await abrirPeloGatilho(gatilhoDe(tela, 'João Lima'));
      await digitarNoPainel('Motivo', 'motivo do João');
      const leiturasAntes = cliente.chamadasDeUsuarios().length;
      await act(async () => desfecho(envio));
      await assentar();

      expect(textoDoPainel()).toContain('Gerenciar João Lima');
      expect(painelAberto()?.querySelector('[role="alert"]')).toBeNull();
      expect(painelAberto()?.querySelector('[role="status"]')).toBeNull();
      expect(textoDoPainel()).toContain('Suspender acesso');
      expect(gruposMarcadosNoPainel()).toEqual(['Tesouraria']);
      expect(campoDoPainel<HTMLTextAreaElement>('Motivo').value).toBe('motivo do João');
      expect(cliente.chamadasDeComando()).toHaveLength(1);
      if (invalidaALista) expect(cliente.chamadasDeUsuarios().length).toBeGreaterThan(leiturasAntes);
      else expect(cliente.chamadasDeUsuarios()).toHaveLength(leiturasAntes);
    },
  );

  it('gerenciar: sucesso tardio depois de fechar ainda atualiza a lista e a contagem da aba Grupos', async () => {
    const envio = adiar<unknown>();
    let leituras = 0;
    const { tela } = await montar({
      usuarios: () => pagina(++leituras === 1 ? [USUARIO_ATIVO] : [usuarioListado({ nome: 'Maria Atualizada', versao: 2 })]),
      grupos: () => ({ itens: [grupoDaGestao({ usuarios: leituras === 1 ? 2 : 1 })] }),
      comando: () => envio.promessa,
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    await fecharPeloBotao();
    await act(async () => envio.resolver(situacaoAlterada('SUSPENSO', 2)));
    await assentar();

    expect(painelAberto()).toBeNull();
    expect(tela.container.querySelector('ul[aria-label="Usuários"]')?.textContent).toContain('Maria Atualizada');
    await irParaAbaGrupos(tela);
    expect(contagemDeUsuariosNaAbaGrupos(tela)).toContain('1 usuário');
  });

  it('409 com a ação já fechada pelo pai não reabre o painel nem mexe em outro usuário', async () => {
    let rejeitar: (erro: Error) => void = () => undefined;
    const outro = usuarioListado({ id: 'u-2' as UsuarioId, nome: 'João Lima', email: 'joao@cdd.local' });
    const { tela } = await montar({
      usuarios: () => pagina([USUARIO_ATIVO, outro]),
      usuario: () => usuarioListado({ versao: 2 }),
      comando: () => new Promise((_, falhar) => (rejeitar = falhar)),
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    await tela.desmontar();
    montadas.pop();
    await act(async () => rejeitar(new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' })));
    await assentar();
    expect(painelAberto()).toBeNull();
  });
});

describe('Acessos: isolamento do fundo', () => {
  it('trava a rolagem e inativa o resto da página enquanto o painel está aberto e restaura ao fechar', async () => {
    const { tela } = await montar();
    const paginaInteira = tela.container;
    await abrirConvite(tela);
    expect(document.body.style.overflow).toBe('hidden');
    expect(paginaInteira.hasAttribute('inert')).toBe(true);
    expect(fundoDoPainel()?.hasAttribute('inert')).toBe(false);
    await teclarEsc();
    expect(document.body.style.overflow).toBe('');
    expect(paginaInteira.hasAttribute('inert')).toBe(false);
  });
});

describe('Acessos: contagem de usuários por grupo', () => {
  it('depois do convite a aba Grupos mostra a contagem nova', async () => {
    let leituras = 0;
    const { tela } = await montar({
      grupos: () => ({ itens: [grupoDaGestao({ usuarios: ++leituras === 1 ? 2 : 3 })] }),
    });
    await abrirConvite(tela);
    await preencherConvite();
    await clicarNoPainel('Registrar convite');
    await irParaAbaGrupos(tela);
    expect(contagemDeUsuariosNaAbaGrupos(tela)).toContain('3 usuários');
  });

  it('depois da troca de grupos a aba Grupos mostra a contagem nova', async () => {
    let leituras = 0;
    const { tela } = await montar({
      grupos: () => ({ itens: [grupoDaGestao({ usuarios: ++leituras === 1 ? 2 : 1 }), GRUPO_SECRETARIA] }),
      comando: () => ({ grupos: [{ id: 'g-2', nome: 'Secretaria' }], versao: 2 }),
    });
    await abrirGerenciar(tela);
    await alternarGrupoNoPainel('Secretaria');
    await clicarNoPainel('Salvar grupos');
    await irParaAbaGrupos(tela);
    expect(contagemDeUsuariosNaAbaGrupos(tela)).toContain('1 usuário');
  });

  it('depois do 409 a lista de usuários é lida de novo', async () => {
    let leituras = 0;
    const { tela } = await montar({
      usuarios: () => pagina(++leituras === 1 ? [USUARIO_ATIVO] : [usuarioListado({ nome: 'Maria Atualizada', versao: 2 })]),
      usuario: () => usuarioListado({ versao: 2 }),
      comando: () => new ErroDaApi({ status: 409, codigo: 'VERSAO_DESATUALIZADA' }),
    });
    await abrirGerenciar(tela);
    await digitarNoPainel('Motivo', 'deixou a tesouraria');
    await clicarNoPainel('Suspender acesso');
    expect(tela.container.querySelector('ul[aria-label="Usuários"]')?.textContent).toContain('Maria Atualizada');
  });
});
