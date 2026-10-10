import { Client } from 'pg';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { INTERVALO_DA_VIGIA_EM_MS } from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import {
  ID_DA_INSTITUICAO_DE_DEMONSTRACAO,
  USERNAME_DO_DEV,
  USUARIOS_FICTICIOS,
} from '../../src/modules/identidade/application/seed-demo/conteudo-da-demonstracao.js';
import {
  BANCO_VAZIO,
  contagensDoBanco,
  permitirLeituraSemContextoAoDono,
} from '../identidade/bootstrap/apoio-de-bootstrap.js';
import { CAMINHO_DOS_USUARIOS, ServidorKeycloakFalso } from '../identidade/keycloak/servidor-keycloak-falso.js';
import { fotoDoBanco, OUTRO_SUB_DO_DEV, SUB_DO_DEV } from '../identidade/seed-demo/apoio-da-semeadura.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import { comoLocalhost, compilarOCli, executarProcessoDoCli } from './apoio-do-cli.js';
import type { ResultadoDoProcesso, VariaveisExtras } from './apoio-do-cli.js';

const PRAZO_DA_COMPILACAO_EM_MS = 180_000;
const INTERVALO_DO_DESPACHANTE_EM_MS = 1_000;
const TOTAL_DE_USUARIOS = 1 + USUARIOS_FICTICIOS.length;
const AMBIENTE_LOCAL: VariaveisExtras = { CDD_AMBIENTE: 'local' };
const SEED = ['seed-demo'];

interface ObservacaoNaBusca {
  readonly conexoesComTransacaoAberta: number;
  readonly instituicoes: number;
}

describe('CLI identidade:seed-demo de ponta a ponta contra Postgres real', () => {
  let banco: BancoDeTeste;
  let observador: Client;
  let keycloak: ServidorKeycloakFalso;
  let urlDoKeycloak: string;
  let pidsDoTeste: number[];
  let observacoes: Promise<ObservacaoNaBusca>[];
  let subDoDevNoProvedor: string;

  beforeAll(() => compilarOCli(), PRAZO_DA_COMPILACAO_EM_MS);

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await permitirLeituraSemContextoAoDono(banco);
    observador = new Client({
      host: inject('hostDoBanco'),
      port: inject('portaDoBanco'),
      user: inject('usuarioSuperusuario'),
      password: inject('senhaSuperusuario'),
      database: banco.nomeDoBanco,
    });
    await observador.connect();
    pidsDoTeste = await Promise.all(
      [banco.owner, banco.app, observador].map(async (cliente) => {
        const { rows } = await cliente.query<{ pid: number }>('select pg_backend_pid() as pid');
        return (rows[0] as { pid: number }).pid;
      }),
    );
    observacoes = [];
    subDoDevNoProvedor = SUB_DO_DEV;
    keycloak = new ServidorKeycloakFalso();
    urlDoKeycloak = comoLocalhost(await keycloak.iniciar());
    keycloak.definir('GET', CAMINHO_DOS_USUARIOS, () => {
      observacoes.push(observarOEstado());
      return { status: 200, corpo: [{ id: subDoDevNoProvedor, username: USERNAME_DO_DEV }] };
    });
  });

  afterEach(async () => {
    await keycloak.derrubar();
    await observador.end();
    await derrubarBancoDeTeste(banco);
  });

  async function observarOEstado(): Promise<ObservacaoNaBusca> {
    const { rows } = await observador.query<{ em_transacao: boolean }>(
      `select xact_start is not null as em_transacao
         from pg_stat_activity
        where datname = current_database() and backend_type = 'client backend' and usename is not null
          and pid <> all($1::int[])`,
      [pidsDoTeste],
    );
    const { instituicoes } = await contagensDoBanco(banco);
    return { conexoesComTransacaoAberta: rows.filter((linha) => linha.em_transacao).length, instituicoes };
  }

  function executar(argumentos: readonly string[], extras: VariaveisExtras = AMBIENTE_LOCAL): Promise<ResultadoDoProcesso> {
    return executarProcessoDoCli(argumentos, banco, urlDoKeycloak, extras);
  }

  function saidaCompleta(resultado: ResultadoDoProcesso): string {
    return `${resultado.stdout}\n${resultado.stderr}`;
  }

  async function subsDoBanco(): Promise<string[]> {
    const { rows } = await banco.owner.query<{ subject_id: string }>(
      'select subject_id from identidade.usuario where subject_id is not null',
    );
    return rows.map((linha) => linha.subject_id);
  }

  it('semeia a demonstração: sai 0, informa instituição e contagens, sem sub, e a busca ao Keycloak ocorre antes de qualquer transação', async () => {
    const resultado = await executar(SEED);
    const [observacao] = await Promise.all(observacoes);

    expect(resultado.codigo).toBe(0);
    expect(resultado.stderr).toBe('');
    expect(resultado.stdout).toContain(`Instituição de demonstração: ${ID_DA_INSTITUICAO_DE_DEMONSTRACAO} (criada)`);
    expect(resultado.stdout).toContain(`Usuários criados: ${TOTAL_DE_USUARIOS}; já existentes: 0`);
    expect(await contagensDoBanco(banco)).toMatchObject({ instituicoes: 1, grupos: 6, usuarios: TOTAL_DE_USUARIOS, marcador: 0 });
    expect(observacoes).toHaveLength(1);
    expect(observacao).toEqual({ conexoesComTransacaoAberta: 0, instituicoes: 0 });
    for (const sub of await subsDoBanco()) expect(saidaCompleta(resultado)).not.toContain(sub);
    expect(saidaCompleta(resultado)).not.toContain(SUB_DO_DEV);
  });

  it('busca o dev por username exato com a conta de serviço, uma única vez, e não toca em nenhuma outra rota', async () => {
    await executar(SEED);

    const [busca] = keycloak.chamadasA('GET', CAMINHO_DOS_USUARIOS);
    expect(busca?.consulta.get('username')).toBe(USERNAME_DO_DEV);
    expect(busca?.consulta.get('exact')).toBe('true');
    expect(keycloak.requisicoes.filter(({ metodo, caminho }) => !(metodo === 'POST' && caminho.endsWith('/token')))).toHaveLength(1);
  });

  it('roda só com BANCO_URL (papel cdd_app, RLS valendo) sem ler BANCO_URL_MIGRACAO, e não cria poller no processo', async () => {
    const resultado = await executar(SEED, { ...AMBIENTE_LOCAL, BANCO_URL_MIGRACAO: undefined });

    expect(resultado.codigo).toBe(0);
    expect(await contagensDoBanco(banco)).toMatchObject({ instituicoes: 1, usuarios: TOTAL_DE_USUARIOS });
    expect(resultado.intervalosCriados).not.toContain(INTERVALO_DO_DESPACHANTE_EM_MS);
    expect(resultado.intervalosCriados).not.toContain(INTERVALO_DA_VIGIA_EM_MS);
  });

  it('reexecução: sai 0, não duplica nem altera nada e informa que tudo já existia', async () => {
    await executar(SEED);
    const antes = await fotoDoBanco(banco);

    const segunda = await executar(SEED);

    expect(segunda.codigo).toBe(0);
    expect(segunda.stdout).toContain('(já existia)');
    expect(segunda.stdout).toContain(`Usuários criados: 0; já existentes: ${TOTAL_DE_USUARIOS}`);
    expect(await fotoDoBanco(banco)).toEqual(antes);
  });

  it.each([
    ['CDD_AMBIENTE=producao', { CDD_AMBIENTE: 'producao' }],
    ['CDD_AMBIENTE=homologacao', { CDD_AMBIENTE: 'homologacao' }],
    ['CDD_AMBIENTE ausente', { CDD_AMBIENTE: undefined }],
  ])('recusa com %s: sai 2, não fala com o Keycloak e o banco fica vazio', async (_cenario, extras) => {
    const resultado = await executar(SEED, extras);

    expect(resultado.codigo).toBe(2);
    expect(resultado.stderr).toContain('CDD_AMBIENTE');
    expect(keycloak.requisicoes).toEqual([]);
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('recusa com BANCO_URL de host postgres: sai 2 sem expor a URL, sem falar com o Keycloak', async () => {
    const urlComHostPostgres = urlDoAppPara(banco).replace(/@[^/]+\//, '@postgres:5432/');

    const resultado = await executar(SEED, { ...AMBIENTE_LOCAL, BANCO_URL: urlComHostPostgres });

    expect(resultado.codigo).toBe(2);
    expect(resultado.stderr).toContain('BANCO_URL');
    expect(saidaCompleta(resultado)).not.toContain('postgres:5432');
    expect(keycloak.requisicoes).toEqual([]);
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('recusa com Keycloak fora do loopback: sai 2 sem conectar', async () => {
    const resultado = await executar(SEED, { ...AMBIENTE_LOCAL, KEYCLOAK_URL_BASE: 'https://id.casa.org' });

    expect(resultado.codigo).toBe(2);
    expect(resultado.stderr).toContain('KEYCLOAK_URL_BASE');
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('recusa quando existe instituição que não é a de demonstração (bootstrap antes): sai 3 e não altera nada', async () => {
    keycloak.definir('GET', `${CAMINHO_DOS_USUARIOS}/${SUB_DO_DEV}`, {
      status: 200,
      corpo: { id: SUB_DO_DEV, email: USERNAME_DO_DEV },
    });
    const bootstrap = await executar(
      ['bootstrap', '--instituicao-nome', 'Casa Real', '--admin-nome', 'Ana', '--admin-email', USERNAME_DO_DEV, '--sujeito', SUB_DO_DEV],
      {},
    );
    expect(bootstrap.codigo).toBe(0);
    const antes = await fotoDoBanco(banco);

    const resultado = await executar(SEED);

    expect(resultado.codigo).toBe(3);
    expect(resultado.stderr).toContain('não é a de demonstração');
    expect(await fotoDoBanco(banco)).toEqual(antes);
  });

  it('sub do dev divergente: sai 3, manda rodar pnpm infra:zerar, não altera nada e o sub antigo permanece', async () => {
    await executar(SEED);
    const antes = await fotoDoBanco(banco);
    subDoDevNoProvedor = OUTRO_SUB_DO_DEV;

    const resultado = await executar(SEED);

    expect(resultado.codigo).toBe(3);
    expect(resultado.stderr).toContain('pnpm infra:zerar');
    expect(saidaCompleta(resultado)).not.toContain(OUTRO_SUB_DO_DEV);
    expect(await fotoDoBanco(banco)).toEqual(antes);
    expect(await subsDoBanco()).toContain(SUB_DO_DEV);
    expect(await subsDoBanco()).not.toContain(OUTRO_SUB_DO_DEV);
  });

  it('dev ausente no Keycloak: sai 3 com instrução e o banco fica vazio', async () => {
    keycloak.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo: [] });

    const resultado = await executar(SEED);

    expect(resultado.codigo).toBe(3);
    expect(resultado.stderr).toContain('pnpm infra:subir');
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('Keycloak indisponível: sai 1 e o banco fica vazio', async () => {
    keycloak.definir('GET', CAMINHO_DOS_USUARIOS, { status: 503 });

    const resultado = await executar(SEED);

    expect(resultado.codigo).toBe(1);
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('uso inválido: seed-demo não aceita flags e sai 2 sem abrir banco nem Keycloak', async () => {
    const resultado = await executar(['seed-demo', '--admin-email=x@y.org']);

    expect(resultado.codigo).toBe(2);
    expect(keycloak.requisicoes).toEqual([]);
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });
});
