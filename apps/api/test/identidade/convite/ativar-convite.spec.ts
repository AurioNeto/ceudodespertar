import { createHash } from 'node:crypto';
import type { InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { AtivarConvite } from '../../../src/modules/identidade/application/convite/ativar-convite.js';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import { GeradorDeTokenDeConvite } from '../../../src/modules/identidade/application/convite/gerador-de-token-de-convite.js';
import type { TokenDeConvite } from '../../../src/modules/identidade/application/convite/gerador-de-token-de-convite.js';
import { ResolvedorDeConvite } from '../../../src/modules/identidade/application/convite/resolvedor-de-convite.js';
import type { DonoDoConvite } from '../../../src/modules/identidade/application/convite/resolvedor-de-convite.js';
import { Convite } from '../../../src/modules/identidade/domain/usuario/convite.js';
import { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type {
  ContextoDaTransacao,
  ModoDeTransacao,
} from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { ContextoDaRequisicao } from '../../../src/shared/infrastructure/contexto-da-requisicao.js';
import { Relogio } from '../../../src/shared/infrastructure/relogio.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import type { Result } from '../../../src/shared/kernel/result.js';
import type { ErroDeDominio } from '../../../src/shared/kernel/erro-de-dominio.js';

const TOKEN = 'tokenDoConvite_-0123456789abcdefghijklmnopqrstuvw';
const HASH_DO_TOKEN = createHash('sha256').update(TOKEN).digest('hex');
const SUJEITO = 'sub-maria';
const EMAIL = 'maria@casa.org';
const INSTITUICAO = 'a0000000-0000-7000-8000-0000000000aa' as InstituicaoId;
const USUARIO_ID = 'a1000000-0000-7000-8000-000000000002' as UsuarioId;
const AUTOR = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;
const CRIADO_EM = new Date('2026-10-09T12:00:00.000Z');
const EXPIRA_EM = new Date('2026-10-12T12:00:00.000Z');

class RelogioAjustavel extends Relogio {
  constructor(public instante: Date) {
    super();
  }

  agora(): Date {
    return this.instante;
  }
}

class Diario {
  readonly eventos: string[] = [];

  registrar(evento: string): void {
    this.eventos.push(evento);
  }

  instituicaoVigente(): string {
    return String(ContextoDaRequisicao.atual()?.instituicaoId);
  }
}

class GeradorDeHashReal extends GeradorDeTokenDeConvite {
  gerar(): TokenDeConvite {
    throw new Error('não usado na ativação');
  }

  hashDe(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

class ResolvedorFalso extends ResolvedorDeConvite {
  readonly hashesRecebidos: string[] = [];

  constructor(
    private readonly dono: DonoDoConvite | undefined,
    private readonly diario: Diario,
  ) {
    super();
  }

  resolver(hash: string): Promise<DonoDoConvite | undefined> {
    this.hashesRecebidos.push(hash);
    this.diario.registrar(`resolver(contexto=${this.diario.instituicaoVigente()})`);
    return Promise.resolve(this.dono);
  }
}

class UnidadeFalsa extends UnidadeDeTrabalho {
  readonly modos: ModoDeTransacao[] = [];

  constructor(private readonly diario: Diario) {
    super();
  }

  transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modos.push(modo);
    this.diario.registrar(`transacao(${modo}, contexto=${this.diario.instituicaoVigente()})`);
    return fn({} as ContextoDaTransacao);
  }
}

class RepositorioFalso extends RepositorioDeUsuario {
  readonly salvos: Usuario[] = [];

  constructor(
    private readonly usuario: Usuario | undefined,
    private readonly diario: Diario,
  ) {
    super();
  }

  porId(): Promise<Usuario | undefined> {
    this.diario.registrar(`porId(contexto=${this.diario.instituicaoVigente()})`);
    return Promise.resolve(this.usuario);
  }

  adicionar(): Promise<void> {
    throw new Error('não usado na ativação');
  }

  salvar(usuario: Usuario): Promise<number> {
    this.diario.registrar(`salvar(contexto=${this.diario.instituicaoVigente()})`);
    this.salvos.push(usuario);
    return Promise.resolve(usuario.versao + 1);
  }
}

class ConferidorFalso extends ConferidorDeSujeito {
  readonly consultados: string[] = [];
  resposta: () => Promise<string | undefined> = () => Promise.resolve(EMAIL);

  constructor(private readonly diario: Diario) {
    super();
  }

  emailDo(sujeito: string): Promise<string | undefined> {
    this.consultados.push(sujeito);
    this.diario.registrar('conferir');
    return this.resposta();
  }
}

interface Cenario {
  readonly usuario: Usuario | undefined;
  readonly dono?: DonoDoConvite | null;
  readonly agora?: Date;
}

function usuarioPendente(convite: Convite | null = Convite.criar(HASH_DO_TOKEN, EXPIRA_EM, AUTOR, CRIADO_EM)): Usuario {
  return usuarioEm('CONVITE_PENDENTE', convite);
}

function usuarioEm(situacao: SituacaoUsuario, convite: Convite | null, subjectId: string | null = null): Usuario {
  return Usuario.reconstituir(
    {
      id: USUARIO_ID,
      pessoaId: null,
      subjectId,
      nome: 'Maria Silva',
      email: EMAIL,
      situacao,
      grupos: [],
      ativadoEm: null,
      suspensoEm: null,
      ultimoAcessoEm: null,
      convite,
    },
    5,
  );
}

function montar({ usuario, dono = { instituicaoId: INSTITUICAO, usuarioId: USUARIO_ID }, agora = CRIADO_EM }: Cenario) {
  const diario = new Diario();
  const resolvedor = new ResolvedorFalso(dono ?? undefined, diario);
  const unidade = new UnidadeFalsa(diario);
  const repositorio = new RepositorioFalso(usuario, diario);
  const conferidor = new ConferidorFalso(diario);
  const relogio = new RelogioAjustavel(agora);
  const ativar = new AtivarConvite(unidade, repositorio, resolvedor, new GeradorDeHashReal(), conferidor, relogio);
  return { diario, resolvedor, unidade, repositorio, conferidor, relogio, ativar };
}

function codigoDe(resultado: Result<unknown, ErroDeDominio>): string | undefined {
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

describe('AtivarConvite', () => {
  it('ativa o usuário, grava uma vez, devolve ATIVO e guarda o sub e o instante da ativação', async () => {
    const usuario = usuarioPendente();
    const { ativar, repositorio, relogio } = montar({ usuario });
    relogio.instante = new Date('2026-10-10T08:00:00.000Z');

    const resultado = await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

    expect(resultado).toEqual({ tipo: 'ok', valor: { situacao: 'ATIVO' } });
    expect(repositorio.salvos).toEqual([usuario]);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.subjectId).toBe(SUJEITO);
    expect(usuario.ativadoEm).toEqual(relogio.instante);
    expect(usuario.convite?.usadoEm).toEqual(relogio.instante);
    expect(usuario.retirarEventos()).toMatchObject([{ tipo: 'USUARIO_ATIVADO', dados: { subjectId: SUJEITO } }]);
  });

  it('resolve o convite pelo SHA-256 hexadecimal do texto do token', async () => {
    const { ativar, resolvedor } = montar({ usuario: usuarioPendente() });

    await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

    expect(resolvedor.hashesRecebidos).toEqual([HASH_DO_TOKEN]);
  });

  it('segue a ordem: resolver, entrar na instituição e abrir a escrita, carregar, conferir no provedor, salvar', async () => {
    const { ativar, diario } = montar({ usuario: usuarioPendente() });

    await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

    expect(diario.eventos).toEqual([
      'resolver(contexto=undefined)',
      `transacao(escrita, contexto=${INSTITUICAO})`,
      `porId(contexto=${INSTITUICAO})`,
      'conferir',
      `salvar(contexto=${INSTITUICAO})`,
    ]);
  });

  it('abre a transação de escrita uma única vez, dentro do contexto da instituição do convite', async () => {
    const { ativar, unidade } = montar({ usuario: usuarioPendente() });

    await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

    expect(unidade.modos).toEqual(['escrita']);
  });

  it('o instante de ativação vem do relógio injetado', async () => {
    const { ativar, relogio } = montar({ usuario: usuarioPendente() });
    relogio.instante = EXPIRA_EM;

    expect(ehOk(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(true);
  });

  describe('convite desconhecido ou inválido: o Admin API nunca é chamado', () => {
    it('hash sem dono: CONVITE_INVALIDO, sem transação, sem leitura, sem provedor', async () => {
      const { ativar, conferidor, unidade, diario } = montar({ usuario: usuarioPendente(), dono: null });

      const resultado = await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

      expect(codigoDe(resultado)).toBe('CONVITE_INVALIDO');
      expect(conferidor.consultados).toEqual([]);
      expect(unidade.modos).toEqual([]);
      expect(diario.eventos).toEqual(['resolver(contexto=undefined)']);
    });

    it('dono sem usuário carregado: CONVITE_INVALIDO sem provedor', async () => {
      const { ativar, conferidor } = montar({ usuario: undefined });

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe('CONVITE_INVALIDO');
      expect(conferidor.consultados).toEqual([]);
    });

    it.each([
      ['convite revogado', Convite.criar(HASH_DO_TOKEN, EXPIRA_EM, AUTOR, CRIADO_EM).revogar(CRIADO_EM), 'CONVITE_INVALIDO'],
      ['hash diferente do convite vigente', Convite.criar('f'.repeat(64), EXPIRA_EM, AUTOR, CRIADO_EM), 'CONVITE_INVALIDO'],
      ['usuário sem convite', null, 'CONVITE_INVALIDO'],
      ['convite já usado', Convite.criar(HASH_DO_TOKEN, EXPIRA_EM, AUTOR, CRIADO_EM).usar(CRIADO_EM), 'CONVITE_JA_USADO'],
    ] as const)('%s: %s sem provedor e sem gravar', async (_descricao, convite, codigo) => {
      const { ativar, conferidor, repositorio } = montar({ usuario: usuarioPendente(convite) });

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(codigo);
      expect(conferidor.consultados).toEqual([]);
      expect(repositorio.salvos).toEqual([]);
    });

    it('convite expirado: CONVITE_EXPIRADO sem provedor e sem gravar', async () => {
      const { ativar, conferidor, repositorio, relogio } = montar({ usuario: usuarioPendente() });
      relogio.instante = new Date(EXPIRA_EM.getTime() + 1);

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe('CONVITE_EXPIRADO');
      expect(conferidor.consultados).toEqual([]);
      expect(repositorio.salvos).toEqual([]);
    });

    it.each([
      ['SUSPENSO', 'USUARIO_SUSPENSO'],
      ['REVOGADO', 'USUARIO_REVOGADO'],
    ] as const)('usuário %s: %s sem provedor e sem gravar', async (situacao, codigo) => {
      const conviteUsado = Convite.criar(HASH_DO_TOKEN, EXPIRA_EM, AUTOR, CRIADO_EM).usar(CRIADO_EM);
      const { ativar, conferidor, repositorio } = montar({ usuario: usuarioEm(situacao, conviteUsado, SUJEITO) });

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(codigo);
      expect(conferidor.consultados).toEqual([]);
      expect(repositorio.salvos).toEqual([]);
    });
  });

  describe('expiração: a fronteira é estritamente maior que', () => {
    it('no instante exato da expiração ainda ativa', async () => {
      const { ativar, relogio } = montar({ usuario: usuarioPendente() });
      relogio.instante = EXPIRA_EM;

      expect(ehOk(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(true);
    });

    it('um milissegundo depois recusa com CONVITE_EXPIRADO', async () => {
      const { ativar, relogio } = montar({ usuario: usuarioPendente() });
      relogio.instante = new Date(EXPIRA_EM.getTime() + 1);

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe('CONVITE_EXPIRADO');
    });
  });

  describe('conferência do e-mail do sujeito no provedor', () => {
    it('consulta o provedor com o sub do token e nada mais', async () => {
      const { ativar, conferidor } = montar({ usuario: usuarioPendente() });

      await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

      expect(conferidor.consultados).toEqual([SUJEITO]);
    });

    it('aceita e-mail com caixa diferente, nos dois sentidos', async () => {
      const { ativar, conferidor } = montar({ usuario: usuarioPendente() });
      conferidor.resposta = () => Promise.resolve('MARIA@Casa.ORG');

      expect(ehOk(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(true);
    });

    it.each([
      ['e-mail de outra pessoa', 'joao@casa.org'],
      ['e-mail ausente no provedor', undefined],
      ['e-mail com sufixo', `${EMAIL}.br`],
    ])('%s: CONVITE_DE_OUTRO_SUJEITO, sem gravar e sem consumir o convite', async (_descricao, email) => {
      const usuario = usuarioPendente();
      const { ativar, conferidor, repositorio } = montar({ usuario });
      conferidor.resposta = () => Promise.resolve(email);

      const resultado = await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

      expect(codigoDe(resultado)).toBe('CONVITE_DE_OUTRO_SUJEITO');
      expect(repositorio.salvos).toEqual([]);
      expect(usuario.situacao).toBe('CONVITE_PENDENTE');
      expect(usuario.subjectId).toBeNull();
      expect(usuario.convite?.usadoEm).toBeNull();
      expect(usuario.retirarEventos()).toEqual([]);
    });

    it('provedor indisponível: PROVEDOR_DE_IDENTIDADE_INDISPONIVEL, sem gravar', async () => {
      const usuario = usuarioPendente();
      const { ativar, conferidor, repositorio } = montar({ usuario });
      conferidor.resposta = () => Promise.reject(new ProvedorDeIdentidadeIndisponivel('timeout'));

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(
        'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL',
      );
      expect(repositorio.salvos).toEqual([]);
      expect(usuario.situacao).toBe('CONVITE_PENDENTE');
    });

    it('erro inesperado do conferidor não é engolido', async () => {
      const { ativar, conferidor } = montar({ usuario: usuarioPendente() });
      conferidor.resposta = () => Promise.reject(new TypeError('falha de programação'));

      await expect(ativar.executar({ token: TOKEN, sujeito: SUJEITO })).rejects.toThrow(TypeError);
    });
  });

  describe('retentativa', () => {
    const conviteUsado = Convite.criar(HASH_DO_TOKEN, EXPIRA_EM, AUTOR, CRIADO_EM).usar(CRIADO_EM);

    it('convite já usado pelo mesmo sub com usuário ATIVO devolve ATIVO sem gravar nem consultar o provedor', async () => {
      const { ativar, conferidor, repositorio } = montar({ usuario: usuarioEm('ATIVO', conviteUsado, SUJEITO) });

      const resultado = await ativar.executar({ token: TOKEN, sujeito: SUJEITO });

      expect(resultado).toEqual({ tipo: 'ok', valor: { situacao: 'ATIVO' } });
      expect(repositorio.salvos).toEqual([]);
      expect(conferidor.consultados).toEqual([]);
    });

    it('convite já usado por outro sub: CONVITE_JA_USADO', async () => {
      const { ativar, conferidor, repositorio } = montar({ usuario: usuarioEm('ATIVO', conviteUsado, 'sub-de-outra-pessoa') });

      expect(codigoDe(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe('CONVITE_JA_USADO');
      expect(repositorio.salvos).toEqual([]);
      expect(conferidor.consultados).toEqual([]);
    });

    it('a retentativa vale mesmo depois de o convite expirar', async () => {
      const { ativar, relogio } = montar({ usuario: usuarioEm('ATIVO', conviteUsado, SUJEITO) });
      relogio.instante = new Date(EXPIRA_EM.getTime() + 3_600_000);

      expect(ehOk(await ativar.executar({ token: TOKEN, sujeito: SUJEITO }))).toBe(true);
    });
  });
});
