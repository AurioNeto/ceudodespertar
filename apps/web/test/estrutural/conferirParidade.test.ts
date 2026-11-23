import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CODIGO_DE_FALHA,
  CODIGO_DE_SUCESSO,
  codigo,
  criarRepositorio,
  emSrc,
  removerRepositoriosCriados,
  type Repositorio,
  type Resultado,
  TEMPO_DO_CENARIO_EM_MS,
} from './apoioDoConferirMovimento';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scripts', 'conferir-paridade.mjs');
const ROTULO_DE_LIBERACAO = 'tela-alterada-pelo-dono';

const TESTE_DA_TELA = 'pages/financeiro/FechamentoPage/FechamentoPage.dom.test.tsx';
const COMPONENTE_DA_TELA = 'pages/financeiro/FechamentoPage/components/Checklist/Checklist.tsx';
const HOOK_DA_TELA = 'pages/financeiro/FechamentoPage/hooks/useFechamento.ts';
const MOCK_DA_TELA = 'pages/financeiro/FechamentoPage/mocks/historico.ts';

const BASE = {
  [TESTE_DA_TELA]: codigo("it('mostra o checklist', () => {});", "it('mostra os saldos', () => {});"),
  [COMPONENTE_DA_TELA]: codigo('export const Checklist = () => null;'),
  [HOOK_DA_TELA]: codigo("import { historico } from '../mocks/historico';", 'export const useFechamento = () => historico;'),
  [MOCK_DA_TELA]: codigo('export const historico = [];'),
};

function conferir(depois: (repositorio: Repositorio) => void, rotulos?: string[]): Resultado {
  const repositorio = criarRepositorio();
  repositorio.escrever(BASE);
  const base = repositorio.commitar('base');
  depois(repositorio);
  repositorio.commitar('depois');

  const resultado = spawnSync(process.execPath, [SCRIPT, '--base', base], {
    cwd: repositorio.raiz,
    encoding: 'utf8',
    env: { ...process.env, ROTULOS_DO_PR: rotulos === undefined ? '' : JSON.stringify(rotulos) },
  });

  return { codigo: resultado.status, saida: resultado.stdout, erro: resultado.stderr };
}

describe('conferir-paridade', () => {
  afterEach(removerRepositoriosCriados);

  it(
    'passa quando a integração troca só o miolo do hook e apaga o mock',
    () => {
      const resultado = conferir((repositorio) => {
        repositorio.escrever({ [HOOK_DA_TELA]: codigo('export const useFechamento = () => consultarApi();') });
        repositorio.apagar(MOCK_DA_TELA);
      });

      expect(resultado).toMatchObject({ codigo: CODIGO_DE_SUCESSO, saida: 'conferir-paridade: 0 ocorrência(s)\n' });
    },
    TEMPO_DO_CENARIO_EM_MS,
  );

  it(
    'acusa teste de tela apagado',
    () => {
      const resultado = conferir((repositorio) => repositorio.apagar(TESTE_DA_TELA));

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.saida).toContain(`ERRO ${emSrc(TESTE_DA_TELA)}: teste de tela apagado`);
    },
    TEMPO_DO_CENARIO_EM_MS,
  );

  it(
    'acusa teste de tela que perdeu um caso e aceita o que ganhou caso ou mudou o corpo',
    () => {
      const perdeu = conferir((repositorio) =>
        repositorio.escrever({ [TESTE_DA_TELA]: codigo("it('mostra o checklist', () => {});") }),
      );
      const corpoMudou = conferir((repositorio) =>
        repositorio.escrever({
          [TESTE_DA_TELA]: codigo("it('mostra o checklist', () => { render(); });", "it('mostra os saldos', () => {});"),
        }),
      );
      const ganhou = conferir((repositorio) =>
        repositorio.escrever({ [TESTE_DA_TELA]: `${BASE[TESTE_DA_TELA]}${codigo("it('mostra o erro da API', () => {});")}` }),
      );

      expect(perdeu.codigo).toBe(CODIGO_DE_FALHA);
      expect(perdeu.saida).toContain(`ERRO ${emSrc(TESTE_DA_TELA)}: teste de tela perdeu 1 caso(s): mostra os saldos`);
      expect(ganhou.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(corpoMudou.codigo).toBe(CODIGO_DE_SUCESSO);
    },
    TEMPO_DO_CENARIO_EM_MS,
  );

  it(
    'acusa componente de tela apagado e aceita o que foi só movido',
    () => {
      const apagado = conferir((repositorio) => repositorio.apagar(COMPONENTE_DA_TELA));
      const movido = conferir((repositorio) =>
        repositorio.mover(COMPONENTE_DA_TELA, 'pages/financeiro/components/Checklist/Checklist.tsx'),
      );

      expect(apagado.codigo).toBe(CODIGO_DE_FALHA);
      expect(apagado.saida).toContain(`ERRO ${emSrc(COMPONENTE_DA_TELA)}: arquivo de componente de tela apagado`);
      expect(movido.codigo).toBe(CODIGO_DE_SUCESSO);
    },
    TEMPO_DO_CENARIO_EM_MS,
  );

  it(
    'com o rótulo do dono lista as ocorrências como liberadas e não falha',
    () => {
      const resultado = conferir((repositorio) => repositorio.apagar(TESTE_DA_TELA), ['outro', ROTULO_DE_LIBERACAO]);

      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(`LIBERADO ${emSrc(TESTE_DA_TELA)}: teste de tela apagado`);
    },
    TEMPO_DO_CENARIO_EM_MS,
  );

  it(
    'sem --base falha dizendo o que falta',
    () => {
      const repositorio = criarRepositorio();
      const resultado = spawnSync(process.execPath, [SCRIPT], { cwd: repositorio.raiz, encoding: 'utf8' });

      expect(resultado.status).toBe(CODIGO_DE_FALHA);
      expect(resultado.stderr).toContain('informe --base <ref>');
    },
    TEMPO_DO_CENARIO_EM_MS,
  );
});
