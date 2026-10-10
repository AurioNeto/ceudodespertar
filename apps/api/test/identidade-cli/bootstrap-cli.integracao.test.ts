import { Client } from 'pg';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { INTERVALO_DA_VIGIA_EM_MS } from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import {
  BANCO_VAZIO,
  contagensDoBanco,
  permitirLeituraSemContextoAoDono,
  sha256Hex,
} from '../identidade/bootstrap/apoio-de-bootstrap.js';
import { CAMINHO_DOS_USUARIOS, ServidorKeycloakFalso } from '../identidade/keycloak/servidor-keycloak-falso.js';
import { comoLocalhost, compilarOCli, executarProcessoDoCli } from './apoio-do-cli.js';
import type { ResultadoDoProcesso } from './apoio-do-cli.js';

const EMAIL = 'administradora@casa.org';
const SUJEITO = '7f1c0d2e-3a4b-4c5d-8e6f-a1b2c3d4e5f6';
const ID_NO_KEYCLOAK = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const CAMINHO_DO_ENVIO = `${CAMINHO_DOS_USUARIOS}/${ID_NO_KEYCLOAK}/execute-actions-email`;
const ATRASO_DA_OBSERVACAO_EM_MS = 400;
const INTERVALO_DO_DESPACHANTE_EM_MS = 1_000;
const PRAZO_DA_COMPILACAO_EM_MS = 180_000;
const ARGUMENTOS_DO_CONVITE = [
  'bootstrap',
  '--instituicao-nome',
  'Casa do Despertar',
  '--admin-nome',
  'Administradora Inicial',
  '--admin-email',
  EMAIL,
];
const ARGUMENTOS_DO_VINCULO = [...ARGUMENTOS_DO_CONVITE, '--sujeito', SUJEITO];

interface ObservacaoNoEnvio {
  readonly marcadores: number;
  readonly instituicoes: number;
  readonly conexoesDoCli: number;
  readonly conexoesComTransacaoAberta: number;
  readonly papeisConectados: readonly string[];
}

describe('CLI identidade:bootstrap de ponta a ponta contra Postgres real', () => {
  let banco: BancoDeTeste;
  let observador: Client;
  let keycloak: ServidorKeycloakFalso;
  let urlDoKeycloak: string;
  let pidsDoTeste: number[];
  let observacoes: Promise<ObservacaoNoEnvio>[];

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
    keycloak = new ServidorKeycloakFalso();
    urlDoKeycloak = comoLocalhost(await keycloak.iniciar());
    keycloak.definir('POST', CAMINHO_DOS_USUARIOS, () => {
      observacoes.push(observarOEstado());
      return {
        status: 201,
        cabecalhos: { location: `${urlDoKeycloak}${CAMINHO_DOS_USUARIOS}/${ID_NO_KEYCLOAK}` },
        atrasoEmMs: ATRASO_DA_OBSERVACAO_EM_MS,
      };
    });
    keycloak.definir('PUT', CAMINHO_DO_ENVIO, { status: 204 });
    keycloak.definir('GET', `${CAMINHO_DOS_USUARIOS}/${SUJEITO}`, { status: 200, corpo: { id: SUJEITO, email: EMAIL } });
  });

  afterEach(async () => {
    await keycloak.derrubar();
    await observador.end();
    await derrubarBancoDeTeste(banco);
  });

  async function observarOEstado(): Promise<ObservacaoNoEnvio> {
    const contagens = await contagensDoBanco(banco);
    const { rows } = await observador.query<{ papel: string; em_transacao: boolean }>(
      `select usename as papel, xact_start is not null as em_transacao
         from pg_stat_activity
        where datname = current_database() and backend_type = 'client backend' and usename is not null
          and pid <> all($1::int[])`,
      [pidsDoTeste],
    );
    return {
      marcadores: contagens.marcador,
      instituicoes: contagens.instituicoes,
      conexoesDoCli: rows.length,
      conexoesComTransacaoAberta: rows.filter((linha) => linha.em_transacao).length,
      papeisConectados: [...new Set(rows.map((linha) => linha.papel))],
    };
  }

  function executar(argumentos: readonly string[]): Promise<ResultadoDoProcesso> {
    return executarProcessoDoCli(argumentos, banco, urlDoKeycloak);
  }

  function saidaCompleta(resultado: ResultadoDoProcesso): string {
    return `${resultado.stdout}\n${resultado.stderr}`;
  }

  function tokenDoConviteEnviado(): string {
    const [envio] = keycloak.chamadasA('PUT', CAMINHO_DO_ENVIO);
    const destino = new URLSearchParams(envio?.consultaBruta).get('redirect_uri') ?? '';
    return new URL(destino).searchParams.get('convite') ?? '';
  }

  it('modo convite: grava tudo, envia só depois do commit e fora de transação, sai 0 sem expor token nem hash', async () => {
    const resultado = await executar(ARGUMENTOS_DO_CONVITE);
    const [observacao] = await Promise.all(observacoes);
    const token = tokenDoConviteEnviado();

    expect(resultado.codigo).toBe(0);
    expect(resultado.stdout).toContain('Próximo passo');
    expect(await contagensDoBanco(banco)).toMatchObject({
      instituicoes: 1,
      grupos: 6,
      usuarios: 1,
      convites: 1,
      marcador: 1,
    });
    expect(keycloak.chamadasA('POST', CAMINHO_DOS_USUARIOS)).toHaveLength(1);
    expect(keycloak.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(1);
    expect(observacao?.conexoesDoCli).toBeGreaterThan(0);
    expect(observacao).toMatchObject({ marcadores: 1, instituicoes: 1, conexoesComTransacaoAberta: 0 });
    expect(token).not.toBe('');
    expect(saidaCompleta(resultado)).not.toContain(token);
    expect(saidaCompleta(resultado)).not.toContain(sha256Hex(token));
    expect(resultado.stderr).toBe('');
  });

  it('conecta como cdd_app pela BANCO_URL e nunca como o papel da BANCO_URL_MIGRACAO', async () => {
    await executar(ARGUMENTOS_DO_CONVITE);
    const [observacao] = await Promise.all(observacoes);

    expect(observacao?.papeisConectados).toEqual(['cdd_app']);
  });

  it('nenhum poller é criado no processo do CLI mesmo com CDD_PROCESSO=api no ambiente, e o processo encerra sozinho', async () => {
    const resultado = await executar(ARGUMENTOS_DO_CONVITE);

    expect(resultado.codigo).toBe(0);
    expect(resultado.intervalosCriados).not.toContain(INTERVALO_DO_DESPACHANTE_EM_MS);
    expect(resultado.intervalosCriados).not.toContain(INTERVALO_DA_VIGIA_EM_MS);
  });

  it('falha no envio: sai 1 com a instrução de recuperação, o marcador fica gravado e nada vaza', async () => {
    keycloak.definir('PUT', CAMINHO_DO_ENVIO, { status: 400 });

    const resultado = await executar(ARGUMENTOS_DO_CONVITE);

    expect(resultado.codigo).toBe(1);
    expect(resultado.stderr).toContain('O bootstrap foi gravado');
    expect(resultado.stderr).toContain('pnpm infra:zerar');
    expect(resultado.stderr).toContain('DBA');
    expect(saidaCompleta(resultado)).not.toContain(tokenDoConviteEnviado());
    expect(await contagensDoBanco(banco)).toMatchObject({ instituicoes: 1, usuarios: 1, marcador: 1 });
  });

  it('modo vínculo: sem envio, usuário ATIVO com o sujeito e saída sem o sujeito', async () => {
    const resultado = await executar(ARGUMENTOS_DO_VINCULO);
    const { rows } = await banco.owner.query<{ situacao: string; subject_id: string }>(
      'select situacao, subject_id from identidade.usuario',
    );

    expect(resultado.codigo).toBe(0);
    expect(keycloak.chamadasA('POST', CAMINHO_DOS_USUARIOS)).toHaveLength(0);
    expect(keycloak.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(0);
    expect(rows).toEqual([{ situacao: 'ATIVO', subject_id: SUJEITO }]);
    expect(saidaCompleta(resultado)).not.toContain(SUJEITO);
  });

  it('segunda execução: código de regra, nada novo gravado e nenhum envio', async () => {
    await executar(ARGUMENTOS_DO_CONVITE);
    const antes = await contagensDoBanco(banco);
    const envios = keycloak.chamadasA('PUT', CAMINHO_DO_ENVIO).length;

    const segunda = await executar(ARGUMENTOS_DO_CONVITE);

    expect(segunda.codigo).toBe(3);
    expect(segunda.stderr).toContain('já foi executado');
    expect(await contagensDoBanco(banco)).toEqual(antes);
    expect(keycloak.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(envios);
  });

  it('e-mail do sujeito divergente: código de regra e nada gravado', async () => {
    keycloak.definir('GET', `${CAMINHO_DOS_USUARIOS}/${SUJEITO}`, { status: 200, corpo: { id: SUJEITO, email: 'outra@casa.org' } });

    const resultado = await executar(ARGUMENTOS_DO_VINCULO);

    expect(resultado.codigo).toBe(3);
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });

  it('uso inválido: código 2 sem abrir o banco', async () => {
    const resultado = await executar(['bootstrap', '--senha=x']);

    expect(resultado.codigo).toBe(2);
    expect(resultado.stderr).toContain('Flag desconhecida; use apenas:');
    expect(resultado.stderr).not.toContain('senha');
    expect(await contagensDoBanco(banco)).toEqual(BANCO_VAZIO);
  });
});
