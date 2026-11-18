import type { AplicacaoDeAcesso } from '../identidade/acesso/ambiente-http.js';
import { novoGrupoNomeado } from '../identidade/acesso/ambiente-http.js';
import { semearUsuarios, usuarioAtivoEm } from '../identidade/gestao-de-usuarios/apoio-http.js';
import { INSTITUICAO_A, INSTITUICAO_B } from '../eventos/apoio.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { gravarNaInstituicao } from '../pessoas/apoio.js';
import { idDoCadastro, subirAplicacaoDoFinanceiro } from './apoio-http.js';

export const ROTA = '/api/v1/financeiro/lancamentos';
export const AUTOR = 'sub-registrador-lancamento';
export const OUTRO = 'sub-outro-registrador';
export const TESOURARIA = 'sub-tesouraria-lancamento';
export const CASA_B = 'sub-casa-b-lancamento';
export const CONTA = '0198a3c0-0000-7000-8000-0000000000c1';
export const VALOR = { natureza: 'DESPESA', valor: 2000, motivo: 'Registro de teste' };

export async function subirLancamentos(banco: BancoDeTeste) {
  const app = await subirAplicacaoDoFinanceiro(banco);
  const registro = novoGrupoNomeado('Registrar sem ler caixa', ['financeiro.lancamento.registrar', 'financeiro.lancamento.ler_proprios']);
  const tesouraria = novoGrupoNomeado('Conferir e ler caixa', ['financeiro.lancamento.registrar', 'financeiro.lancamento.ler', 'financeiro.lancamento.confirmar', 'financeiro.lancamento.estornar']);
  await semearUsuarios(app, INSTITUICAO_A, [registro, tesouraria], [usuarioAtivoEm(AUTOR, [registro]), usuarioAtivoEm(OUTRO, [registro]), usuarioAtivoEm(TESOURARIA, [tesouraria])]);
  const grupoB = novoGrupoNomeado('Caixa B', ['financeiro.lancamento.registrar', 'financeiro.lancamento.ler', 'financeiro.lancamento.confirmar', 'financeiro.lancamento.estornar']);
  await semearUsuarios(app, INSTITUICAO_B, [grupoB], [usuarioAtivoEm(CASA_B, [grupoB])]);
  await gravarNaInstituicao(banco, INSTITUICAO_A, "insert into financeiro.conta (id, instituicao_id, tipo, titularidade, nome) values ($1, $2, 'DINHEIRO', 'INSTITUCIONAL', 'Caixa')", [CONTA, INSTITUICAO_A]);
  const unidadeId = await idDoCadastro(banco, INSTITUICAO_A, 'unidade', 'CDD');
  const categoriaId = await idDoCadastro(banco, INSTITUICAO_A, 'categoria', 'MANUTENCAO');
  return { app, completo: { ...VALOR, unidadeId, contaId: CONTA, dataCompetencia: '2026-10-01', etiquetas: [{ categoriaId, valor: 2000 }] } };
}

export async function pedirLancamento(app: AplicacaoDeAcesso, sujeito: string, rota = ROTA, metodo: 'POST' | 'PUT' | 'DELETE' | undefined = undefined, corpo?: unknown, versao?: number, chave?: string) {
  const cabecalhos: Record<string, string> = {};
  if (versao !== undefined) cabecalhos['if-match'] = String(versao);
  if (chave !== undefined) cabecalhos['idempotency-key'] = chave;
  const resposta = await app.pedirComo(sujeito, rota, { metodo, corpo, cabecalhos });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: (texto ? JSON.parse(texto) : {}) as Record<string, unknown>, location: resposta.headers.get('location') };
}
