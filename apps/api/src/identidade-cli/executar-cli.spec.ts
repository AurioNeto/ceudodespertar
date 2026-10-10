import type { UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { FalhaNoEnvioDoConvite } from '../modules/identidade/application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../modules/identidade/application/convite/enviador-de-convite.js';
import type { ComandoDeBootstrap, ResultadoDoBootstrap, ResumoDaSemeadura } from '../modules/identidade/public-api.js';
import { ErroDeAmbienteInvalido } from '../shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { erroDeDominio, ErroDeDominioException } from '../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../shared/kernel/erro-de-dominio.js';
import { err, ok } from '../shared/kernel/result.js';
import type { Result } from '../shared/kernel/result.js';
import {
  CODIGO_DE_INFRAESTRUTURA,
  CODIGO_DE_REGRA,
  CODIGO_DE_SUCESSO,
  CODIGO_DE_USO_OU_VALIDACAO,
} from './codigos-de-saida.js';
import { executarCli } from './executar-cli.js';
import type { ContextoDoCli } from './executar-cli.js';

const TOKEN = 'token-secreto-do-convite';
const SUJEITO = 'sub-de-0123456789-do-provedor';
const INSTITUICAO_ID = '0192f000-0000-7000-8000-000000000001';
const USUARIO_ID = '0192f000-0000-7000-8000-000000000002' as UsuarioId;
const ARGUMENTOS = ['bootstrap', '--instituicao-nome', 'Casa', '--admin-nome', 'Ana', '--admin-email', 'ana@casa.org'];

const CONVITE: ConviteParaEnviar = {
  usuarioId: USUARIO_ID,
  email: 'ana@casa.org',
  nome: 'Ana',
  token: TOKEN,
  expiraEm: new Date('2026-10-13T00:00:00.000Z'),
};

type Executar = () => Promise<Result<ResultadoDoBootstrap, ErroDeDominio>>;
type ExecutarSemeadura = () => Promise<Result<ResumoDaSemeadura, ErroDeDominio>>;

const RESUMO_DA_SEMEADURA: ResumoDaSemeadura = {
  instituicaoId: INSTITUICAO_ID,
  instituicaoCriada: true,
  usuariosCriados: 9,
  usuariosJaExistentes: 0,
};

const semeaduraConcluida: ExecutarSemeadura = () => Promise.resolve(ok(RESUMO_DA_SEMEADURA));

class ContextoDeTeste implements ContextoDoCli {
  readonly comandosRecebidos: ComandoDeBootstrap[] = [];
  readonly convitesEnviados: ConviteParaEnviar[] = [];
  encerrado = 0;
  falhaAoEncerrar = false;
  enviar: (convite: ConviteParaEnviar) => Promise<void> = (convite) => {
    this.convitesEnviados.push(convite);
    return Promise.resolve();
  };

  semeaduras = 0;

  constructor(
    private readonly executarBootstrap: Executar,
    private readonly executarSemeadura: ExecutarSemeadura = semeaduraConcluida,
  ) {}

  readonly dependencias = {
    bootstrap: {
      executar: (comando: ComandoDeBootstrap) => {
        this.comandosRecebidos.push(comando);
        return this.executarBootstrap();
      },
    },
    enviador: { enviar: (convite: ConviteParaEnviar) => this.enviar(convite) },
    semeadura: {
      executar: () => {
        this.semeaduras += 1;
        return this.executarSemeadura();
      },
    },
  };

  encerrar(): Promise<void> {
    this.encerrado += 1;
    return this.falhaAoEncerrar ? Promise.reject(new Error('falha ao fechar')) : Promise.resolve();
  }
}

const porConvite: Executar = () =>
  Promise.resolve(ok<ResultadoDoBootstrap>({ modo: 'CONVITE', instituicaoId: INSTITUICAO_ID, usuarioId: USUARIO_ID, convite: CONVITE }));
const porVinculo: Executar = () =>
  Promise.resolve(ok<ResultadoDoBootstrap>({ modo: 'VINCULO', instituicaoId: INSTITUICAO_ID, usuarioId: USUARIO_ID }));
const recusado = (codigo: Parameters<typeof erroDeDominio>[0]): Executar => () => Promise.resolve(err(erroDeDominio(codigo)));

function textoDe(saida: { stdout: readonly string[]; stderr: readonly string[] }): string {
  return [...saida.stdout, ...saida.stderr].join('\n');
}

describe('executarCli', () => {
  it('modo convite: envia o convite devolvido, sai com sucesso e informa ids e próximo passo sem o token', async () => {
    const contexto = new ContextoDeTeste(porConvite);

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_SUCESSO);
    expect(contexto.convitesEnviados).toEqual([CONVITE]);
    expect(saida.stdout).toEqual(expect.arrayContaining([`Instituição: ${INSTITUICAO_ID}`, `Administrador: ${USUARIO_ID}`]));
    expect(saida.stdout.at(-1)).toMatch(/^Próximo passo:/);
    expect(textoDe(saida)).not.toContain(TOKEN);
    expect(saida.stderr).toEqual([]);
    expect(contexto.encerrado).toBe(1);
  });

  it('modo vínculo: não envia convite e não imprime o sujeito', async () => {
    const contexto = new ContextoDeTeste(porVinculo);

    const saida = await executarCli([...ARGUMENTOS, '--sujeito', SUJEITO], () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_SUCESSO);
    expect(contexto.convitesEnviados).toEqual([]);
    expect(contexto.comandosRecebidos[0]?.sujeito).toBe(SUJEITO);
    expect(textoDe(saida)).not.toContain(SUJEITO);
    expect(contexto.encerrado).toBe(1);
  });

  it('falha no envio: sai com infraestrutura, diz que o bootstrap está gravado e como recuperar, sem token', async () => {
    const contexto = new ContextoDeTeste(porConvite);
    contexto.enviar = () => Promise.reject(new FalhaNoEnvioDoConvite('KeycloakRecusou', `status 500 token=${TOKEN}`));

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_INFRAESTRUTURA);
    expect(saida.stderr[0]).toContain('O bootstrap foi gravado');
    expect(textoDe(saida)).toContain('pnpm infra:zerar');
    expect(textoDe(saida)).toContain('DBA');
    expect(textoDe(saida)).not.toContain(TOKEN);
    expect(saida.stdout).toEqual([]);
    expect(contexto.encerrado).toBe(1);
  });

  it.each([
    ['BOOTSTRAP_JA_EXECUTADO', CODIGO_DE_REGRA],
    ['EMAIL_DO_SUJEITO_DIVERGENTE', CODIGO_DE_REGRA],
    ['SUJEITO_INEXISTENTE', CODIGO_DE_REGRA],
    ['GRUPO_INEXISTENTE', CODIGO_DE_REGRA],
    ['SUJEITO_JA_VINCULADO', CODIGO_DE_REGRA],
    ['PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', CODIGO_DE_INFRAESTRUTURA],
  ] as const)('Result de erro %s: mensagem objetiva, código %i e nenhum envio', async (codigo, esperado) => {
    const contexto = new ContextoDeTeste(recusado(codigo));

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(esperado);
    expect(saida.stderr).toHaveLength(1);
    expect(saida.stderr[0]).not.toContain('at ');
    expect(contexto.convitesEnviados).toEqual([]);
    expect(contexto.encerrado).toBe(1);
  });

  it('ErroDeDominioException lançada vira código de regra', async () => {
    const contexto = new ContextoDeTeste(() => Promise.reject(new ErroDeDominioException(erroDeDominio('SUJEITO_JA_VINCULADO'))));

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_REGRA);
    expect(contexto.encerrado).toBe(1);
  });

  it('RangeError do agregado vira código de validação com a mensagem', async () => {
    const contexto = new ContextoDeTeste(() => Promise.reject(new RangeError('subjectId vazio na ativação')));

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_USO_OU_VALIDACAO);
    expect(saida.stderr[0]).toContain('subjectId vazio na ativação');
    expect(contexto.encerrado).toBe(1);
  });

  it('erro inesperado: infraestrutura, só o tipo e o código de sistema, sem a mensagem nem a pilha', async () => {
    const falha = Object.assign(new Error(`falha com ${TOKEN}`), { code: 'ECONNREFUSED' });
    const contexto = new ContextoDeTeste(() => Promise.reject(falha));

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_INFRAESTRUTURA);
    expect(saida.stderr[0]).toContain('Error, ECONNREFUSED');
    expect(textoDe(saida)).not.toContain(TOKEN);
    expect(contexto.encerrado).toBe(1);
  });

  it('uso inválido: código de uso, usa o parser antes de abrir o contexto', async () => {
    let abertos = 0;

    const saida = await executarCli(['bootstrap', '--senha=x'], () => {
      abertos += 1;
      return Promise.resolve(new ContextoDeTeste(porConvite));
    });

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_USO_OU_VALIDACAO);
    expect(saida.stderr.at(-1)).toMatch(/^Uso:/);
    expect(abertos).toBe(0);
  });

  it('ambiente inválido ao abrir o contexto: infraestrutura com a mensagem de configuração', async () => {
    const saida = await executarCli(ARGUMENTOS, () => Promise.reject(new ErroDeAmbienteInvalido(['OIDC_EMISSOR: ausente'])));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_INFRAESTRUTURA);
    expect(saida.stderr[0]).toContain('OIDC_EMISSOR: ausente');
  });

  it('falha ao encerrar o contexto após sucesso: mantém o código de sucesso e avisa em stderr', async () => {
    const contexto = new ContextoDeTeste(porVinculo);
    contexto.falhaAoEncerrar = true;

    const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto));

    expect(saida.codigoDeSaida).toBe(CODIGO_DE_SUCESSO);
    expect(saida.stdout[0]).toBe('Bootstrap concluído.');
    expect(saida.stderr.at(-1)).toContain('falha ao encerrar o contexto');
  });

  it('códigos de saída são distintos e estáveis', () => {
    expect([CODIGO_DE_SUCESSO, CODIGO_DE_INFRAESTRUTURA, CODIGO_DE_USO_OU_VALIDACAO, CODIGO_DE_REGRA]).toEqual([0, 1, 2, 3]);
  });

  describe('seed-demo', () => {
    const AMBIENTE_LOCAL = {
      CDD_AMBIENTE: 'local',
      KEYCLOAK_URL_BASE: 'http://localhost:8080',
      BANCO_URL: 'postgres://cdd_app:senha-do-banco@localhost:5433/cdd',
    };
    const SEGREDO_NA_URL = 'senha-do-banco';

    function abridorQueLanca(): { abrir: () => Promise<ContextoDoCli>; chamadas: () => number } {
      let chamadas = 0;
      return {
        abrir: () => {
          chamadas += 1;
          throw new Error('o contexto não pode ser aberto antes da guarda');
        },
        chamadas: () => chamadas,
      };
    }

    it.each([
      ['CDD_AMBIENTE ausente', {}],
      ['CDD_AMBIENTE=producao', { ...AMBIENTE_LOCAL, CDD_AMBIENTE: 'producao' }],
      ['CDD_AMBIENTE=homologacao', { ...AMBIENTE_LOCAL, CDD_AMBIENTE: 'homologacao' }],
      ['CDD_AMBIENTE desconhecido', { ...AMBIENTE_LOCAL, CDD_AMBIENTE: 'staging' }],
      ['banco no host postgres', { ...AMBIENTE_LOCAL, BANCO_URL: `postgres://cdd_app:${SEGREDO_NA_URL}@postgres:5432/cdd` }],
      ['banco ausente', { ...AMBIENTE_LOCAL, BANCO_URL: undefined }],
      ['Keycloak fora do loopback', { ...AMBIENTE_LOCAL, KEYCLOAK_URL_BASE: 'https://id.casa.org' }],
      ['Keycloak ausente', { ...AMBIENTE_LOCAL, KEYCLOAK_URL_BASE: undefined }],
    ])('recusa com %s sem abrir contexto, banco ou Keycloak e sai com código de uso', async (_cenario, variaveis) => {
      const { abrir, chamadas } = abridorQueLanca();

      const saida = await executarCli(['seed-demo'], abrir, variaveis);

      expect(saida.codigoDeSaida).toBe(CODIGO_DE_USO_OU_VALIDACAO);
      expect(chamadas()).toBe(0);
      expect(saida.stdout).toEqual([]);
      expect(saida.stderr).toHaveLength(1);
      expect(textoDe(saida)).not.toContain(SEGREDO_NA_URL);
    });

    it.each([['local'], ['ci']])('CDD_AMBIENTE=%s com loopback: abre o contexto, semeia e encerra', async (ambiente) => {
      const contexto = new ContextoDeTeste(porConvite);

      const saida = await executarCli(['seed-demo'], () => Promise.resolve(contexto), { ...AMBIENTE_LOCAL, CDD_AMBIENTE: ambiente });

      expect(saida.codigoDeSaida).toBe(CODIGO_DE_SUCESSO);
      expect(contexto.semeaduras).toBe(1);
      expect(contexto.comandosRecebidos).toEqual([]);
      expect(contexto.encerrado).toBe(1);
      expect(saida.stdout).toEqual(
        expect.arrayContaining([
          `Instituição de demonstração: ${INSTITUICAO_ID} (criada)`,
          'Usuários criados: 9; já existentes: 0',
        ]),
      );
      expect(saida.stderr).toEqual([]);
    });

    it('reexecução: informa que a instituição já existia e que nada foi criado', async () => {
      const contexto = new ContextoDeTeste(
        porConvite,
        () => Promise.resolve(ok({ ...RESUMO_DA_SEMEADURA, instituicaoCriada: false, usuariosCriados: 0, usuariosJaExistentes: 9 })),
      );

      const saida = await executarCli(['seed-demo'], () => Promise.resolve(contexto), AMBIENTE_LOCAL);

      expect(saida.stdout).toEqual(
        expect.arrayContaining([`Instituição de demonstração: ${INSTITUICAO_ID} (já existia)`, 'Usuários criados: 0; já existentes: 9']),
      );
    });

    it.each([
      ['INSTITUICAO_NAO_DEMO_EXISTENTE', CODIGO_DE_REGRA],
      ['SUJEITO_DO_DEV_DIVERGENTE', CODIGO_DE_REGRA],
      ['DEV_NAO_ENCONTRADO_NO_PROVEDOR', CODIGO_DE_REGRA],
      ['PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', CODIGO_DE_INFRAESTRUTURA],
    ] as const)('Result de erro %s: código %i e mensagem objetiva', async (codigo, esperado) => {
      const contexto = new ContextoDeTeste(porConvite, () => Promise.resolve(err(erroDeDominio(codigo))));

      const saida = await executarCli(['seed-demo'], () => Promise.resolve(contexto), AMBIENTE_LOCAL);

      expect(saida.codigoDeSaida).toBe(esperado);
      expect(saida.stdout).toEqual([]);
      expect(saida.stderr).toHaveLength(1);
      expect(saida.stderr[0]).not.toMatch(/Operação recusada pela regra de negócio/);
      expect(contexto.encerrado).toBe(1);
    });

    it('sub divergente do dev manda rodar pnpm infra:zerar', async () => {
      const contexto = new ContextoDeTeste(porConvite, () => Promise.resolve(err(erroDeDominio('SUJEITO_DO_DEV_DIVERGENTE'))));

      const saida = await executarCli(['seed-demo'], () => Promise.resolve(contexto), AMBIENTE_LOCAL);

      expect(saida.stderr[0]).toContain('pnpm infra:zerar');
    });

    it('o bootstrap não depende de CDD_AMBIENTE nem de loopback', async () => {
      const contexto = new ContextoDeTeste(porVinculo);

      const saida = await executarCli(ARGUMENTOS, () => Promise.resolve(contexto), { CDD_AMBIENTE: 'producao' });

      expect(saida.codigoDeSaida).toBe(CODIGO_DE_SUCESSO);
      expect(contexto.semeaduras).toBe(0);
    });
  });
});
