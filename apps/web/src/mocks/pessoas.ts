import type { Permissao } from '@cdd/contracts';

export type VinculoDaCasa = 'Fardado' | 'Frequentador' | 'Visitante';
export type EstadoDaAnamnese = 'em dia' | 'vencida' | 'ausente';

export interface PessoaDaCasa {
  id: number;
  nome: string;
  vinculo: VinculoDaCasa;
  desde: number;
  telefone: string;
  cidade: string;
  nascimento: string;
  emergencia: string;
  anamnese: EstadoDaAnamnese;
  respondidaEm: string | null;
  versao: string | null;
  /** Pontos declarados na anamnese: título e a explicação que veio junto. */
  pontos: readonly (readonly [string, string])[];
  ativa: boolean;
}

export const pessoasIniciais: readonly PessoaDaCasa[] = [
  { id: 1, nome: 'Ana Beatriz Cordeiro', vinculo: 'Fardado', desde: 2014, telefone: '(11) 98812-4410', cidade: 'São Paulo · SP', nascimento: '12/04/1988', emergencia: 'Marcos Cordeiro · (11) 99110-2233', anamnese: 'em dia', respondidaEm: '14/08/2026', versao: 'v3', pontos: [['Uso contínuo de sertralina', '50 mg pela manhã, com acompanhamento psiquiátrico desde 2021']], ativa: true },
  { id: 2, nome: 'Carlos Menezes', vinculo: 'Fardado', desde: 2009, telefone: '(11) 99740-1187', cidade: 'Cotia · SP', nascimento: '03/09/1975', emergencia: 'Rita Menezes · (11) 98800-1010', anamnese: 'em dia', respondidaEm: '02/07/2026', versao: 'v3', pontos: [['Pressão alta controlada', 'losartana 50 mg, acompanhamento semestral']], ativa: true },
  { id: 3, nome: 'Rosa Silveira', vinculo: 'Fardado', desde: 2016, telefone: '(11) 97733-8890', cidade: 'Ibiúna · SP', nascimento: '27/01/1962', emergencia: 'Chico Aguiar · (11) 98123-4567', anamnese: 'em dia', respondidaEm: '20/06/2026', versao: 'v3', pontos: [], ativa: true },
  { id: 4, nome: 'Eduardo Pires', vinculo: 'Frequentador', desde: 2022, telefone: '(11) 98120-7781', cidade: 'São Paulo · SP', nascimento: '19/11/1993', emergencia: 'Silvia Pires · (11) 99933-1200', anamnese: 'vencida', respondidaEm: '11/03/2024', versao: 'v2', pontos: [['Histórico de crise de ansiedade', 'declarado na v2; precisa reconfirmar na versão atual']], ativa: true },
  { id: 5, nome: 'Marina Tavares', vinculo: 'Visitante', desde: 2026, telefone: '(21) 99811-4520', cidade: 'Rio de Janeiro · RJ', nascimento: '05/06/1991', emergencia: 'Luiz Tavares · (21) 98800-4411', anamnese: 'ausente', respondidaEm: null, versao: null, pontos: [], ativa: true },
  { id: 6, nome: 'Sérgio Bittencourt', vinculo: 'Fardado', desde: 2011, telefone: '(11) 99180-3322', cidade: 'Vargem Grande · SP', nascimento: '30/08/1968', emergencia: 'Neide Bittencourt · (11) 98811-0099', anamnese: 'em dia', respondidaEm: '01/08/2026', versao: 'v3', pontos: [['Cirurgia cardíaca em 2023', 'liberado pelo cardiologista; evitar jejum prolongado']], ativa: true },
  { id: 7, nome: 'Helena Duarte', vinculo: 'Frequentador', desde: 2019, telefone: '(11) 98444-2210', cidade: 'São Roque · SP', nascimento: '22/02/1996', emergencia: 'Paulo Duarte · (11) 99000-8877', anamnese: 'em dia', respondidaEm: '28/07/2026', versao: 'v3', pontos: [['Gestante — 5º mês', 'orientada a não tomar até o parto; participa fora do salão']], ativa: true },
  { id: 8, nome: 'Tobias Aguiar', vinculo: 'Fardado', desde: 2007, telefone: '(11) 97001-1234', cidade: 'Ibiúna · SP', nascimento: '14/07/1959', emergencia: 'Secretaria da casa', anamnese: 'em dia', respondidaEm: '19/06/2026', versao: 'v3', pontos: [], ativa: true },
  { id: 9, nome: 'Bruna Camargo', vinculo: 'Visitante', desde: 2026, telefone: '(19) 98899-6655', cidade: 'Campinas · SP', nascimento: '08/12/1999', emergencia: 'Tais Camargo · (19) 99888-1122', anamnese: 'ausente', respondidaEm: null, versao: null, pontos: [], ativa: true },
  { id: 10, nome: 'Otávio Lins', vinculo: 'Frequentador', desde: 2021, telefone: '(11) 99666-3311', cidade: 'São Paulo · SP', nascimento: '17/05/1984', emergencia: 'Ana Lins · (11) 98777-2211', anamnese: 'vencida', respondidaEm: '09/02/2024', versao: 'v2', pontos: [['Diabetes tipo 2', 'em uso de insulina; declarado na v2']], ativa: false },
];

/**
 * O catálogo de permissões é o do Doc 3 — o domínio verifica o código, nunca
 * o nome do grupo. Aqui cada código ganha o rótulo e a explicação que a tela
 * mostra a quem monta o grupo.
 */
export const CATALOGO_DE_PERMISSOES: readonly { codigo: Permissao; rotulo: string; explicacao: string }[] = [
  {
    codigo: 'financeiro.lancamento.registrar',
    rotulo: 'Registrar lançamentos',
    explicacao: 'abre a tela de registro e grava gastos, entradas e transferências',
  },
  {
    codigo: 'financeiro.lancamento.confirmar',
    rotulo: 'Consolidar e conferir',
    explicacao: 'aprova a fila de verificação e grava consolidado',
  },
  {
    codigo: 'financeiro.lancamento.estornar',
    rotulo: 'Estornar lançamentos',
    explicacao: 'reverte um lançamento já consolidado, com motivo',
  },
  {
    codigo: 'financeiro.periodo.fechar',
    rotulo: 'Fechar e reabrir período',
    explicacao: 'trava o mês e reabre com motivo registrado',
  },
  {
    codigo: 'financeiro.conta.gerenciar',
    rotulo: 'Gerenciar contas e fundos',
    explicacao: 'cria, edita e inativa contas e reservas',
  },
  { codigo: 'financeiro.dre.ler', rotulo: 'Ver relatórios', explicacao: 'abre o painel de relatórios e exporta' },
  {
    codigo: 'eventos.evento.editar',
    rotulo: 'Gerenciar cerimônias',
    explicacao: 'abre, edita e cancela trabalhos na agenda',
  },
  { codigo: 'pessoas.pessoa.editar', rotulo: 'Gerenciar pessoas', explicacao: 'cadastra e edita pessoas da casa' },
  {
    codigo: 'pessoas.anamnese.ler',
    rotulo: 'Ver respostas de anamnese',
    explicacao: 'lê a ficha de saúde completa de cada pessoa',
  },
  {
    codigo: 'pessoas.formulario.publicar',
    rotulo: 'Gerenciar formulário de anamnese',
    explicacao: 'cria versões, edita perguntas e publica',
  },
  {
    codigo: 'sistema.usuario.gerenciar',
    rotulo: 'Gerenciar acessos',
    explicacao: 'concede, suspende e revoga acesso ao sistema',
  },
];

export interface GrupoDeAcesso {
  id: string;
  nome: string;
  descricao: string;
  permissoes: readonly Permissao[];
}

export const gruposIniciais: readonly GrupoDeAcesso[] = [
  {
    id: 'direcao',
    nome: 'Direção',
    descricao: 'decide, autoriza exceções e reabre períodos',
    permissoes: CATALOGO_DE_PERMISSOES.map((p) => p.codigo),
  },
  {
    id: 'tesouraria',
    nome: 'Tesouraria',
    descricao: 'lança, confere, concilia e fecha o mês',
    permissoes: [
      'financeiro.lancamento.registrar',
      'financeiro.lancamento.confirmar',
      'financeiro.lancamento.estornar',
      'financeiro.periodo.fechar',
      'financeiro.conta.gerenciar',
      'financeiro.dre.ler',
    ],
  },
  {
    id: 'secretaria',
    nome: 'Secretaria',
    descricao: 'cuida do cadastro, das anamneses e da agenda',
    permissoes: [
      'financeiro.lancamento.registrar',
      'eventos.evento.editar',
      'pessoas.pessoa.editar',
      'pessoas.anamnese.ler',
      'pessoas.formulario.publicar',
      'financeiro.dre.ler',
    ],
  },
  {
    id: 'rapido',
    nome: 'Registro rápido',
    descricao: 'lança do celular; tudo entra como a conferir',
    permissoes: ['financeiro.lancamento.registrar'],
  },
  {
    id: 'guardiao',
    nome: 'Guardião',
    descricao: 'vê a lista de preparo e os pontos de atenção do trabalho',
    permissoes: ['eventos.evento.editar'],
  },
  { id: 'leitura', nome: 'Leitura', descricao: 'só consulta relatórios, não altera nada', permissoes: ['financeiro.dre.ler'] },
];

export type SituacaoDeAcesso = 'ativo' | 'convite' | 'suspenso';

export interface AcessoAoSistema {
  email: string;
  grupo: string;
  situacao: SituacaoDeAcesso;
  ultimoAcesso: string;
}

export const acessosIniciais: Readonly<Record<number, AcessoAoSistema>> = {
  1: { email: 'ana.cordeiro@cdd.org', grupo: 'Secretaria', situacao: 'ativo', ultimoAcesso: 'hoje, 08:41' },
  2: { email: 'carlos.menezes@cdd.org', grupo: 'Tesouraria', situacao: 'ativo', ultimoAcesso: 'ontem, 19:12' },
  3: { email: 'rosa.silveira@cdd.org', grupo: 'Registro rápido', situacao: 'ativo', ultimoAcesso: '28/08, 14:22' },
  6: { email: 'sergio.bittencourt@cdd.org', grupo: 'Direção', situacao: 'ativo', ultimoAcesso: '30/08, 09:05' },
  8: { email: 'tobias.aguiar@cdd.org', grupo: 'Guardião', situacao: 'convite', ultimoAcesso: 'nunca entrou' },
  10: { email: 'otavio.lins@cdd.org', grupo: 'Leitura', situacao: 'suspenso', ultimoAcesso: '11/04, 21:33' },
};
