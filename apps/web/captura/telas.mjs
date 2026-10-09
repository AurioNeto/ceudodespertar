import { TOKEN_DA_INSCRICAO } from './ambiente.mjs';

const CPF_SEM_CADASTRO = '000.000.000-00';
const CPF_COM_ANAMNESE_A_ATUALIZAR = '529.187.340-11';
const CPF_COM_ANAMNESE_EM_DIA = '330.918.775-42';

const identificarPeloCpf = (cpf) => async (pagina) => {
  const campo = pagina.getByLabel('CPF');
  await campo.fill(cpf);
  await campo.press('Enter');
};

const declararEContinuar = async (pagina) => {
  await pagina.getByRole('checkbox').click();
  await pagina.getByRole('button', { name: 'Continuar' }).click();
};

const preencherParticipacaoEEnviar = async (pagina) => {
  await pagina.getByLabel('Quanto você vai contribuir').fill('150,00');
  await pagina.getByLabel('Contato de emergência').fill('Maria Souza, (11) 98888-7777');
  await pagina.getByLabel('Restrições alimentares').fill('Sem restrições');
  await pagina.getByRole('button', { name: 'Enviar minha inscrição' }).click();
};

const PASSOS_DA_INSCRICAO = {
  cadastro: [identificarPeloCpf(CPF_SEM_CADASTRO)],
  anamnese: [identificarPeloCpf(CPF_COM_ANAMNESE_A_ATUALIZAR)],
  declaracao: [identificarPeloCpf(CPF_COM_ANAMNESE_EM_DIA)],
  participacao: [identificarPeloCpf(CPF_COM_ANAMNESE_EM_DIA), declararEContinuar],
  pronto: [identificarPeloCpf(CPF_COM_ANAMNESE_EM_DIA), declararEContinuar, preencherParticipacaoEEnviar],
};

const USUARIO_A_GERENCIAR = 'Maria das Graças Souza';

const abrirAbaDeGrupos = (pagina) => pagina.getByRole('button', { name: 'Grupos', exact: true }).click();

const abrirPainelNomeado = async (pagina, botao, tituloDoPainel) => {
  await botao.click();
  await pagina.getByRole('dialog', { name: tituloDoPainel }).waitFor();
};

const abrirPainelDoUsuario = (pagina) =>
  abrirPainelNomeado(
    pagina,
    pagina.getByRole('button', { name: `Gerenciar acesso de ${USUARIO_A_GERENCIAR}` }),
    `Gerenciar ${USUARIO_A_GERENCIAR}`,
  );

const abrirPainelDeConvite = (pagina) =>
  abrirPainelNomeado(pagina, pagina.getByRole('button', { name: 'Convidar', exact: true }), 'Convidar usuário');

const executarEmOrdem = (passos) => async (pagina) => {
  for (const passo of passos) await passo(pagina);
};

export function montarCatalogoDeTelas({ rotas, publicas }) {
  if (!rotas.acessos) {
    throw new Error('A rota "acessos" saiu de navegacao.ts; ajuste captura/telas.mjs.');
  }
  const autenticadas = Object.entries(rotas).map(([nome, caminho]) => ({ nome, caminho, sessao: 'ativa' }));
  const caminhoDaInscricao = publicas.inscricaoPublica.replace(':token', TOKEN_DA_INSCRICAO);
  const passosDaInscricao = Object.entries(PASSOS_DA_INSCRICAO).map(([passo, passos]) => ({
    nome: `inscricaoPublica.${passo}`,
    caminho: caminhoDaInscricao,
    sessao: 'ativa',
    preparar: executarEmOrdem(passos),
  }));

  return [
    ...autenticadas,
    { nome: 'acessos.grupos', caminho: rotas.acessos, sessao: 'ativa', preparar: abrirAbaDeGrupos },
    { nome: 'acessos.gerenciar', caminho: rotas.acessos, sessao: 'ativa', preparar: abrirPainelDoUsuario },
    { nome: 'acessos.convidar', caminho: rotas.acessos, sessao: 'ativa', preparar: abrirPainelDeConvite },
    { nome: 'entrar', caminho: publicas.entrar, sessao: 'sem-sessao' },
    { nome: 'retorno', caminho: publicas.retorno, sessao: 'retorno-pendente' },
    { nome: 'retorno.recusado', caminho: publicas.retorno, sessao: 'retorno-recusado' },
    { nome: 'inscricaoPublica', caminho: caminhoDaInscricao, sessao: 'ativa' },
    ...passosDaInscricao,
  ];
}
