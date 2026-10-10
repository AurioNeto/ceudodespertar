import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configsExecutadosPeloCi, configuracaoExecuta, extrairTestes, lerConfiguracaoDoVitest } from './meta-da-suite.js';
import type { ConfiguracaoDoVitest, TesteExtraido } from './meta-da-suite.js';

const RAIZ_DO_REPOSITORIO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const RAIZ_DA_API = join(RAIZ_DO_REPOSITORIO, 'apps', 'api');
const RAIZ_DOS_CONTRATOS = join(RAIZ_DO_REPOSITORIO, 'packages', 'contracts');
const PASTA_DE_FIXTURES = 'test/estrutural/fixtures/';

interface Pacote {
  readonly scripts: Readonly<Record<string, string>>;
}

function ler(...partes: string[]): string {
  return readFileSync(join(RAIZ_DO_REPOSITORIO, ...partes), 'utf8');
}

function arquivosSob(raiz: string, pasta: string): readonly string[] {
  return readdirSync(join(raiz, pasta), { recursive: true, withFileTypes: true })
    .filter((entrada) => entrada.isFile())
    .map((entrada) => join(entrada.parentPath, entrada.name).slice(raiz.length + 1));
}

function testesDosArquivos(raiz: string, caminhos: readonly string[]): readonly TesteExtraido[] {
  return caminhos.flatMap((caminho) => extrairTestes(caminho, readFileSync(join(raiz, caminho), 'utf8')));
}

export function lerWorkflowDoCi(): string {
  return ler('.github', 'workflows', 'ci.yaml');
}

export function configsDaApiNoCi(workflow: string): readonly ConfiguracaoDoVitest[] {
  const { scripts } = JSON.parse(ler('apps', 'api', 'package.json')) as Pacote;
  return configsExecutadosPeloCi(workflow, '@cdd/api', scripts).map((nome) =>
    lerConfiguracaoDoVitest(nome, readFileSync(join(RAIZ_DA_API, nome), 'utf8')),
  );
}

export function lerTestesDaApi(configs: readonly ConfiguracaoDoVitest[]): readonly TesteExtraido[] {
  const candidatos = arquivosSob(RAIZ_DA_API, 'test').filter(
    (caminho) => !caminho.startsWith(PASTA_DE_FIXTURES) && /\.(spec|test)\.ts$/.test(caminho),
  );
  const executados = candidatos.filter((caminho) => configs.some((config) => configuracaoExecuta(config, caminho)));
  return testesDosArquivos(RAIZ_DA_API, executados);
}

export function lerTestesDosContratos(workflow: string): readonly TesteExtraido[] {
  const { scripts } = JSON.parse(ler('packages', 'contracts', 'package.json')) as Pacote;
  const rodaNoCi = workflow.includes('pnpm --filter @cdd/contracts test');
  const glob = /"(test\/[^"]+)"/.exec(scripts['test'] ?? '')?.[1];
  if (!rodaNoCi || glob === undefined) return [];
  const config: ConfiguracaoDoVitest = { nome: 'node --test', include: [glob], exclude: [] };
  const executados = arquivosSob(RAIZ_DOS_CONTRATOS, 'test').filter((caminho) => configuracaoExecuta(config, caminho));
  return testesDosArquivos(RAIZ_DOS_CONTRATOS, executados);
}

export function lerSecao11DoDoc3(): string {
  const doc = ler('project', 'uploads', 'CDD - System', 'CDD-v2_2-03-identidade-acesso-e-permissoes.md');
  const [, aposTitulo = ''] = doc.split('## 11. Casos de teste de autorização');
  return aposTitulo.split('T30 é o mais valioso')[0] ?? '';
}
