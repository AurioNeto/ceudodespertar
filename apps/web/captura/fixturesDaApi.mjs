const GRUPO_ADMINISTRADOR = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f01', nome: 'Administrador' };
const GRUPO_GOVERNANCA = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f02', nome: 'Governança' };
const GRUPO_TESOURARIA = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f03', nome: 'Tesouraria' };
const GRUPO_ACOLHIMENTO = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f04', nome: 'Acolhimento' };
const GRUPO_REGISTRO = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f05', nome: 'Registro' };
const GRUPO_LEITURA = { id: '7b1f6c1e-3a52-4d0c-9d1e-0a5c1d2e3f06', nome: 'Leitura' };

const USUARIOS = [
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f01',
    nome: 'Maria das Graças Souza',
    email: 'maria.gracas@cdd.local',
    situacao: 'ATIVO',
    grupos: [GRUPO_TESOURARIA],
    versao: 3,
    ultimoAcessoEm: '2026-09-01T17:30:00.000Z',
  },
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f02',
    nome: 'João Batista Ferreira',
    email: 'joao.batista@cdd.local',
    situacao: 'ATIVO',
    grupos: [GRUPO_ADMINISTRADOR],
    versao: 5,
    ultimoAcessoEm: '2026-09-02T14:05:00.000Z',
  },
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f03',
    nome: 'Ana Clara Moreira',
    email: 'ana.moreira@cdd.local',
    situacao: 'CONVITE_PENDENTE',
    grupos: [GRUPO_ACOLHIMENTO],
    versao: 1,
    ultimoAcessoEm: null,
  },
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f04',
    nome: 'Pedro Henrique Lima',
    email: 'pedro.lima@cdd.local',
    situacao: 'SUSPENSO',
    grupos: [GRUPO_REGISTRO, GRUPO_LEITURA],
    versao: 2,
    ultimoAcessoEm: '2026-07-18T11:20:00.000Z',
  },
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f05',
    nome: 'Mariana Albuquerque de Vasconcelos Figueiredo',
    email: 'mariana.figueiredo@cdd.local',
    situacao: 'ATIVO',
    grupos: [GRUPO_GOVERNANCA, GRUPO_TESOURARIA],
    versao: 4,
    ultimoAcessoEm: '2026-08-30T21:45:00.000Z',
  },
  {
    id: '3c9d2a40-6f1b-4e8a-a7d5-1b2c3d4e5f06',
    nome: 'Carlos Eduardo Nunes',
    email: 'carlos.nunes@cdd.local',
    situacao: 'REVOGADO',
    grupos: [GRUPO_LEITURA],
    versao: 6,
    ultimoAcessoEm: '2026-05-12T09:10:00.000Z',
  },
];

const GRUPOS = [
  {
    id: GRUPO_ADMINISTRADOR.id,
    codigoSistema: 'ADMINISTRADOR',
    nome: GRUPO_ADMINISTRADOR.nome,
    descricao: 'Acesso total ao sistema.',
    permissoes: [
      'financeiro.lancamento.registrar',
      'financeiro.lancamento.confirmar',
      'financeiro.lancamento.ler',
      'financeiro.conta.ler',
      'financeiro.conta.gerenciar',
      'financeiro.periodo.fechar',
      'eventos.evento.criar',
      'eventos.evento.editar',
      'eventos.inscricao.ler',
      'pessoas.pessoa.ler',
      'pessoas.pessoa.registrar',
      'pessoas.anamnese.ler',
      'estoque.saldo.ler',
      'sistema.usuario.gerenciar',
      'sistema.grupo.gerenciar',
      'sistema.parametro.gerenciar',
      'sistema.auditoria.ler',
    ],
    protegido: true,
    usuarios: 1,
    versao: 2,
  },
  {
    id: GRUPO_GOVERNANCA.id,
    codigoSistema: 'GOVERNANCA',
    nome: GRUPO_GOVERNANCA.nome,
    descricao: 'Acompanha as contas e decide sobre adiantamentos e fechamentos.',
    permissoes: [
      'financeiro.lancamento.ler',
      'financeiro.conta.ler',
      'financeiro.adiantamento.autorizar',
      'financeiro.periodo.fechar',
      'financeiro.dre.ler',
      'financeiro.fluxo_caixa.ler',
      'sistema.auditoria.ler',
    ],
    protegido: false,
    usuarios: 1,
    versao: 1,
  },
  {
    id: GRUPO_TESOURARIA.id,
    codigoSistema: 'TESOURARIA',
    nome: GRUPO_TESOURARIA.nome,
    descricao: 'Cuida do caixa, das faturas e da conciliação.',
    permissoes: [
      'financeiro.lancamento.registrar',
      'financeiro.lancamento.confirmar',
      'financeiro.lancamento.ler',
      'financeiro.conta.ler',
      'financeiro.fatura.gerenciar',
      'financeiro.conciliacao.executar',
    ],
    protegido: false,
    usuarios: 2,
    versao: 3,
  },
  {
    id: GRUPO_ACOLHIMENTO.id,
    codigoSistema: 'ACOLHIMENTO',
    nome: GRUPO_ACOLHIMENTO.nome,
    descricao: 'Recebe os participantes e acompanha as inscrições.',
    permissoes: ['eventos.inscricao.ler', 'eventos.inscricao.registrar', 'eventos.acolhimento.registrar', 'pessoas.pessoa.ler'],
    protegido: false,
    usuarios: 1,
    versao: 1,
  },
  {
    id: GRUPO_REGISTRO.id,
    codigoSistema: 'REGISTRO',
    nome: GRUPO_REGISTRO.nome,
    descricao: '',
    permissoes: ['financeiro.lancamento.registrar', 'financeiro.lancamento.ler_proprios'],
    protegido: false,
    usuarios: 1,
    versao: 1,
  },
  {
    id: GRUPO_LEITURA.id,
    codigoSistema: 'LEITURA',
    nome: GRUPO_LEITURA.nome,
    descricao: 'Só consulta.',
    permissoes: [],
    protegido: false,
    usuarios: 2,
    versao: 1,
  },
];

export const FIXTURES_DA_API = {
  'GET /api/v1/identidade/usuarios': { itens: USUARIOS, proxima: null },
  'GET /api/v1/identidade/grupos': { itens: GRUPOS },
};

const STATUS_DE_ERRO_INTERNO = 500;

export const FIXTURES_DE_LISTA_DE_USUARIOS_FORA_DO_AR = {
  'GET /api/v1/identidade/usuarios': { status: STATUS_DE_ERRO_INTERNO, corpo: { erro: 'ERRO_INTERNO' } },
};
