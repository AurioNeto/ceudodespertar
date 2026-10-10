import type { UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiberacaoDiretaDoAcesso } from '../../../src/modules/identidade/application/usuarios/liberacao-direta-do-acesso.js';
import { ControleDeAcessoNoProvedor } from '../../../src/modules/identidade/application/usuarios/controle-de-acesso-no-provedor.js';
import { TETO_DE_TENTATIVAS } from '../../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import { INSTITUICAO_A, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { escrever, estadoDoUsuario, ROTA_USUARIOS, semearUsuarios, usuarioAtivoEm } from '../gestao-de-usuarios/apoio-http.js';
import { ControleDeAcessoQueRegistra } from './controle-de-acesso-que-registra.js';

const ADMIN = 'sub-admin';
const OUTRO_ADMIN = 'sub-outro-admin';
const ALVO = 'sub-alvo';
const MOTIVO = 'afastamento temporário';
const DEMORA_DO_DESPACHANTE_EM_MS = 5_000;

const desativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/desativar`;
const reativarDe = (id: string) => `${ROTA_USUARIOS}/${id}/reativar`;

interface LinhaDoOutbox {
  readonly tipo: string;
  readonly publicado_em: Date | null;
  readonly tentativas: number;
  readonly proxima_tentativa_em: Date | null;
}

describe('suspensão e reativação no provedor pelo despachante real (T26)', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let provedor: ControleDeAcessoQueRegistra;
  let alvoId: UsuarioId;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    provedor = new ControleDeAcessoQueRegistra();
    aplicacao = await subirAplicacaoDeAcesso(banco, [{ provider: ControleDeAcessoNoProvedor, valor: provedor }]);
    const administracao = novoGrupoNomeado('Administração', ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']);
    const leitura = novoGrupoNomeado('Leitura', ['financeiro.lancamento.ler']);
    const alvo = usuarioAtivoEm(ALVO, [leitura]);
    alvoId = alvo.id;
    await semearUsuarios(
      aplicacao,
      INSTITUICAO_A,
      [administracao, leitura],
      [usuarioAtivoEm(ADMIN, [administracao]), usuarioAtivoEm(OUTRO_ADMIN, [administracao]), alvo],
    );
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function desativarAlvo(): Promise<number> {
    const { versao } = await estadoDoUsuario(banco, INSTITUICAO_A, alvoId);
    const resposta = await escrever(aplicacao, ADMIN, desativarDe(alvoId), { versao, corpo: { motivo: MOTIVO } });
    expect(resposta.status).toBe(200);
    return resposta.corpo.versao as number;
  }

  async function reativarAlvo(versao: number): Promise<void> {
    const resposta = await escrever(aplicacao, ADMIN, reativarDe(alvoId), { versao, corpo: { motivo: MOTIVO } });
    expect(resposta.status).toBe(200);
    await aplicacao.app.get(LiberacaoDiretaDoAcesso).aguardarLiberacoes();
  }

  async function outboxDoAlvo(): Promise<LinhaDoOutbox[]> {
    const resultado = await banco.owner.query(
      `select tipo, publicado_em, tentativas, proxima_tentativa_em from shared.outbox
       where agregado_id = $1 and tipo in ('USUARIO_SUSPENSO', 'USUARIO_REATIVADO') order by id`,
      [alvoId],
    );
    return resultado.rows as LinhaDoOutbox[];
  }

  async function linhaDe(tipo: string): Promise<LinhaDoOutbox> {
    return (await outboxDoAlvo()).find((linha) => linha.tipo === tipo)!;
  }

  async function esperar(condicao: () => Promise<boolean>): Promise<void> {
    await vi.waitFor(async () => expect(await condicao()).toBe(true), { timeout: DEMORA_DO_DESPACHANTE_EM_MS });
  }

  async function esperarPublicado(tipo: string): Promise<void> {
    await esperar(async () => (await linhaDe(tipo)).publicado_em !== null);
  }

  async function esperarPrimeiraFalhaDe(tipo: string): Promise<void> {
    await esperar(async () => (await linhaDe(tipo)).tentativas >= 1);
  }

  async function liberarFila(): Promise<void> {
    await banco.owner.query('update shared.outbox set proxima_tentativa_em = null where agregado_id = $1', [alvoId]);
  }

  it('USUARIO_SUSPENSO chama o provedor uma única vez por evento', async () => {
    await desativarAlvo();
    await esperarPublicado('USUARIO_SUSPENSO');

    await aplicacao.entregarEventos();
    await aplicacao.entregarEventos();

    expect(provedor.chamadas).toEqual([{ operacao: 'bloquear', sujeito: ALVO }]);
  });

  it('suspensão e reativação em sequência bloqueiam, liberam direto e liberam pelo consumidor', async () => {
    const versao = await desativarAlvo();
    await esperarPublicado('USUARIO_SUSPENSO');

    await reativarAlvo(versao);
    await esperarPublicado('USUARIO_REATIVADO');

    expect(provedor.chamadas).toEqual([
      { operacao: 'bloquear', sujeito: ALVO },
      { operacao: 'liberar', sujeito: ALVO },
      { operacao: 'liberar', sujeito: ALVO },
    ]);
  });

  it('falha do provedor agenda nova tentativa com backoff e só depois bloqueia', async () => {
    provedor.falharCom = new Error('Keycloak fora');
    await desativarAlvo();
    await esperarPrimeiraFalhaDe('USUARIO_SUSPENSO');

    await aplicacao.entregarEventos();
    const emBackoff = await linhaDe('USUARIO_SUSPENSO');
    expect(provedor.chamadas).toHaveLength(1);
    expect(emBackoff.publicado_em).toBeNull();
    expect(emBackoff.proxima_tentativa_em!.getTime()).toBeGreaterThan(Date.now());

    provedor.falharCom = undefined;
    await liberarFila();
    await aplicacao.entregarEventos();

    expect((await linhaDe('USUARIO_SUSPENSO')).publicado_em).not.toBeNull();
    expect(provedor.chamadas.map(({ operacao }) => operacao)).toEqual(['bloquear', 'bloquear']);
  });

  it('o evento seguinte do agregado espera o anterior, e o consumidor converge ao estado atual quando a fila anda', async () => {
    provedor.falharCom = new Error('Keycloak fora');
    const versao = await desativarAlvo();
    await esperarPrimeiraFalhaDe('USUARIO_SUSPENSO');
    provedor.falharCom = undefined;

    await reativarAlvo(versao);
    await aplicacao.entregarEventos();

    const reativadoEmEspera = await linhaDe('USUARIO_REATIVADO');
    expect(reativadoEmEspera.publicado_em).toBeNull();
    expect(reativadoEmEspera.tentativas).toBe(0);
    expect(provedor.chamadas.map(({ operacao }) => operacao)).toEqual(['bloquear', 'liberar']);

    await liberarFila();
    await aplicacao.entregarEventos();

    expect((await linhaDe('USUARIO_REATIVADO')).publicado_em).not.toBeNull();
    expect(provedor.chamadas.map(({ operacao }) => operacao)).toEqual(['bloquear', 'liberar', 'liberar', 'liberar']);
  });

  it('SUSPENSO esgotado trava o REATIVADO no outbox, mas a reativação direta ainda libera o provedor', async () => {
    provedor.falharCom = new Error('Keycloak fora');
    const versao = await desativarAlvo();
    await esperarPrimeiraFalhaDe('USUARIO_SUSPENSO');
    await banco.owner.query("update shared.outbox set tentativas = $1 where tipo = 'USUARIO_SUSPENSO' and agregado_id = $2", [
      TETO_DE_TENTATIVAS,
      alvoId,
    ]);
    provedor.falharCom = undefined;
    provedor.chamadas.length = 0;

    await reativarAlvo(versao);
    await liberarFila();
    await aplicacao.entregarEventos();
    await aplicacao.entregarEventos();

    const [suspenso, reativado] = await outboxDoAlvo();
    expect(suspenso).toMatchObject({ tentativas: TETO_DE_TENTATIVAS, publicado_em: null });
    expect(reativado).toMatchObject({ tentativas: 0, publicado_em: null });
    expect(provedor.chamadas).toEqual([{ operacao: 'liberar', sujeito: ALVO }]);
  });

  it('falha na liberação direta não derruba a reativação, que segue 200 e o consumidor ainda converge', async () => {
    const versao = await desativarAlvo();
    await esperarPublicado('USUARIO_SUSPENSO');
    provedor.falharCom = new Error('Keycloak fora');

    await reativarAlvo(versao);
    provedor.falharCom = undefined;
    await liberarFila();
    await aplicacao.entregarEventos();
    await esperarPublicado('USUARIO_REATIVADO');

    expect(provedor.chamadas.map(({ operacao }) => operacao)).toEqual(['bloquear', 'liberar', 'liberar']);
  });
});
