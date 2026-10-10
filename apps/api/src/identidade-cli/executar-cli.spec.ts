import type { UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { FalhaNoEnvioDoConvite } from '../modules/identidade/application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../modules/identidade/application/convite/enviador-de-convite.js';
import type { ComandoDeBootstrap, ResultadoDoBootstrap } from '../modules/identidade/public-api.js';
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

class ContextoDeTeste implements ContextoDoCli {
  readonly comandosRecebidos: ComandoDeBootstrap[] = [];
  readonly convitesEnviados: ConviteParaEnviar[] = [];
  encerrado = 0;
  falhaAoEncerrar = false;
  enviar: (convite: ConviteParaEnviar) => Promise<void> = (convite) => {
    this.convitesEnviados.push(convite);
    return Promise.resolve();
  };

  constructor(private readonly executarBootstrap: Executar) {}

  readonly dependencias = {
    bootstrap: {
      executar: (comando: ComandoDeBootstrap) => {
        this.comandosRecebidos.push(comando);
        return this.executarBootstrap();
      },
    },
    enviador: { enviar: (convite: ConviteParaEnviar) => this.enviar(convite) },
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
});
