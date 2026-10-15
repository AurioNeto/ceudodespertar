import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA } from '../../src/shared/infrastructure/idempotencia/cabecalho-de-idempotencia.js';
import { SemeadorDeCadastrosDaCasa } from '../../src/modules/financeiro/infrastructure/persistencia/semeador-de-cadastros-da-casa.js';
import { FinanceiroModule } from '../../src/modules/financeiro/financeiro.module.js';
import { INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { novoGrupoNomeado, subirAplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { consultarNaInstituicao } from '../identidade/apoio.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

export const ROTA_UNIDADES = '/api/v1/financeiro/unidades';
export const ROTA_GRUPOS_DE_CUSTO = '/api/v1/financeiro/grupos-de-custo';
export const ROTA_CATEGORIAS = '/api/v1/financeiro/categorias';

export const LEITOR = 'sub-leitor-do-plano';
export const GERENTE = 'sub-gerente-do-plano';
export const SEM_GRUPO = 'sub-sem-grupo';
export const GERENTE_DE_B = 'sub-gerente-de-b';

export interface PedidoAoFinanceiro {
  readonly metodo?: 'POST' | 'PUT';
  readonly corpo?: unknown;
  readonly versao?: number | string;
  readonly chave?: string;
}

export interface RespostaDoFinanceiro {
  readonly status: number;
  readonly localizacao: string | null;
  readonly corpo: Record<string, unknown>;
}

export async function subirAplicacaoDoFinanceiro(banco: BancoDeTeste): Promise<AplicacaoDeAcesso> {
  await semearInstituicoes(banco);
  const aplicacao = await subirAplicacaoDeAcesso(banco, [], [FinanceiroModule]);
  const semeador = aplicacao.app.get(SemeadorDeCadastrosDaCasa);
  await semeador.semear(INSTITUICAO_A);
  await semeador.semear(INSTITUICAO_B);
  const leitura = novoGrupoNomeado('Leitura do plano', ['financeiro.plano_contas.ler']);
  const gerencia = novoGrupoNomeado('Gerência do plano', ['financeiro.plano_contas.ler', 'financeiro.plano_contas.gerenciar']);
  await semearUsuarios(
    aplicacao,
    INSTITUICAO_A,
    [leitura, gerencia],
    [usuarioAtivoEm(LEITOR, [leitura]), usuarioAtivoEm(GERENTE, [gerencia]), usuarioAtivoEm(SEM_GRUPO, [])],
  );
  const gerenciaDeB = novoGrupoNomeado('Gerência do plano de B', ['financeiro.plano_contas.ler', 'financeiro.plano_contas.gerenciar']);
  await semearUsuarios(aplicacao, INSTITUICAO_B, [gerenciaDeB], [usuarioAtivoEm(GERENTE_DE_B, [gerenciaDeB])]);
  return aplicacao;
}

export async function pedirAoFinanceiro(
  aplicacao: AplicacaoDeAcesso,
  sujeito: string,
  caminho: string,
  { metodo, corpo, versao, chave }: PedidoAoFinanceiro = {},
): Promise<RespostaDoFinanceiro> {
  const cabecalhos: Record<string, string> = {};
  if (versao !== undefined) cabecalhos['if-match'] = String(versao);
  if (chave !== undefined) cabecalhos[NOME_DO_CABECALHO_DE_IDEMPOTENCIA] = chave;
  const resposta = await aplicacao.pedirComo(sujeito, caminho, { metodo, corpo, cabecalhos });
  return {
    status: resposta.status,
    localizacao: resposta.headers.get('location'),
    corpo: (await resposta.json()) as Record<string, unknown>,
  };
}

export async function idDoCadastro(
  banco: BancoDeTeste,
  instituicaoId: string,
  tabela: 'unidade' | 'grupo_de_custo' | 'categoria',
  codigoSistema: string,
): Promise<string> {
  const [linha] = await consultarNaInstituicao<{ id: string }>(
    banco,
    instituicaoId,
    `select id from financeiro.${tabela} where codigo_sistema = $1`,
    [codigoSistema],
  );
  return linha!.id;
}

export async function contarCadastros(banco: BancoDeTeste, instituicaoId: string, tabela: 'unidade' | 'grupo_de_custo' | 'categoria'): Promise<number> {
  const [linha] = await consultarNaInstituicao<{ total: number }>(
    banco,
    instituicaoId,
    `select count(*)::int as total from financeiro.${tabela}`,
  );
  return linha!.total;
}

export async function linhaDoCadastro<T extends object>(
  banco: BancoDeTeste,
  instituicaoId: string,
  tabela: 'unidade' | 'grupo_de_custo' | 'categoria',
  id: string,
): Promise<T> {
  const [linha] = await consultarNaInstituicao<T>(banco, instituicaoId, `select * from financeiro.${tabela} where id = $1`, [id]);
  return linha!;
}
