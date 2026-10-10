import type { CodigoGrupo, Permissao } from '@cdd/contracts';

export type EtapaDoBackend = 'B0' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';

export const ETAPAS_EM_ORDEM: readonly EtapaDoBackend[] = ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

export interface CamadaDePermissao {
  readonly grupo: CodigoGrupo;
  readonly permissoes: readonly Permissao[];
  readonly resultado: 'concedida' | 'negada';
}

export interface LacunaDeclarada {
  readonly marca: string;
  readonly etapa: EtapaDoBackend;
}

export interface CasoDoDoc3 {
  readonly id: string;
  readonly cenario: string;
  readonly esperado: string;
  readonly etapa: EtapaDoBackend;
  readonly camadaDePermissao?: CamadaDePermissao;
  readonly idsDeTitulo?: readonly string[];
  readonly lacunasDeclaradas?: readonly LacunaDeclarada[];
}

export const CATALOGO_DO_DOC_3_SECAO_11: readonly CasoDoDoc3[] = [
  {
    id: 'T1',
    cenario: 'Acolhimento consulta o painel de arrecadação do evento',
    esperado: '**Permitido**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.arrecadacao.ler'], resultado: 'concedida' },
  },
  {
    id: 'T2',
    cenario: 'Acolhimento consulta resultado/ponto de equilíbrio do evento',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['financeiro.resultado_evento.ler'], resultado: 'negada' },
  },
  {
    id: 'T3',
    cenario: 'Acolhimento lista lançamentos do evento',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['financeiro.lancamento.ler'], resultado: 'negada' },
  },
  {
    id: 'T4',
    cenario: 'Acolhimento marca pagamento de inscrição',
    esperado: '**Permitido**; gera lançamento `INTEGRACAO_EVENTOS`',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.pagamento.registrar'], resultado: 'concedida' },
  },
  {
    id: 'T5',
    cenario: 'Acolhimento tenta editar o lançamento gerado em T4',
    esperado: '**Rejeitado pelo domínio** (L8)',
    etapa: 'B5',
  },
  {
    id: 'T6',
    cenario: 'Acolhimento tenta estornar o lançamento gerado em T4',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['financeiro.lancamento.estornar'], resultado: 'negada' },
  },
  {
    id: 'T7',
    cenario: 'Acolhimento registra solicitação de devolução',
    esperado: '**Permitido**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.devolucao.solicitar'], resultado: 'concedida' },
  },
  {
    id: 'T8',
    cenario: 'Acolhimento tenta efetivar devolução',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.devolucao.efetivar'], resultado: 'negada' },
  },
  {
    id: 'T9',
    cenario: 'Acolhimento consulta DRE',
    esperado: '**403**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['financeiro.dre.ler'], resultado: 'negada' },
  },
  {
    id: 'T10',
    cenario: 'Acolhimento cria evento e inscreve pessoa',
    esperado: '**Permitido**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.evento.criar', 'eventos.inscricao.registrar'], resultado: 'concedida' },
  },
  {
    id: 'T11',
    cenario: 'Acolhimento lê anamnese',
    esperado: '**Permitido**; gera `RegistroDeAcesso`',
    etapa: 'B4',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['pessoas.anamnese.ler'], resultado: 'concedida' },
  },
  {
    id: 'T12',
    cenario: 'Acolhimento gerencia contratação da Munay',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'ACOLHIMENTO', permissoes: ['eventos.contratacao.gerenciar'], resultado: 'negada' },
  },
  {
    id: 'T13',
    cenario: '`REGISTRO` cria lançamento `A_CONFERIR`',
    esperado: '**Permitido**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'REGISTRO', permissoes: ['financeiro.lancamento.registrar'], resultado: 'concedida' },
  },
  {
    id: 'T14',
    cenario: '`REGISTRO` tenta confirmar o próprio lançamento',
    esperado: '**403**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'REGISTRO', permissoes: ['financeiro.lancamento.confirmar'], resultado: 'negada' },
  },
  {
    id: 'T15',
    cenario: '`REGISTRO` consulta o DRE',
    esperado: '**403**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'REGISTRO', permissoes: ['financeiro.dre.ler'], resultado: 'negada' },
  },
  {
    id: 'T16',
    cenario: 'Tesouraria confirma lançamento criado por `REGISTRO`',
    esperado: '**Permitido**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'TESOURARIA', permissoes: ['financeiro.lancamento.confirmar'], resultado: 'concedida' },
  },
  {
    id: 'T16a',
    cenario: '`REGISTRO` lista os lançamentos que ele mesmo registrou',
    esperado: '**Permitido**',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'REGISTRO', permissoes: ['financeiro.lancamento.ler_proprios'], resultado: 'concedida' },
  },
  {
    id: 'T16b',
    cenario: '`REGISTRO` tenta ler lançamento registrado por outro usuário',
    esperado: '**404** — não 403: a existência do lançamento alheio não é informação a que ele tenha acesso',
    etapa: 'B1',
    camadaDePermissao: { grupo: 'REGISTRO', permissoes: ['financeiro.lancamento.ler'], resultado: 'negada' },
  },
  {
    id: 'T16c',
    cenario: '`REGISTRO` responde pendência aberta no próprio lançamento',
    esperado: '**Permitido**',
    etapa: 'B1',
  },
  {
    id: 'T16d',
    cenario: 'Tesouraria tenta responder pendência endereçada ao `REGISTRO`',
    esperado: '**Rejeitado pelo domínio** (Doc 2, L11)',
    etapa: 'B1',
  },
  {
    id: 'T16e',
    cenario: 'Resposta a pendência altera o `status` do lançamento',
    esperado: '**Não deve ocorrer** (Doc 2, L10)',
    etapa: 'B1',
  },
  {
    id: 'T17',
    cenario: 'Administrador **sem** vínculo de padrinho autoriza adiantamento',
    esperado: '**Rejeitado pelo domínio** (A1)',
    etapa: 'B2',
    camadaDePermissao: { grupo: 'ADMINISTRADOR', permissoes: ['financeiro.adiantamento.autorizar'], resultado: 'concedida' },
  },
  {
    id: 'T18',
    cenario: 'Padrinho (grupo `GOVERNANCA`) autoriza adiantamento',
    esperado: '**Permitido**',
    etapa: 'B2',
    camadaDePermissao: { grupo: 'GOVERNANCA', permissoes: ['financeiro.adiantamento.autorizar'], resultado: 'concedida' },
  },
  {
    id: 'T19',
    cenario: 'Padrinho com vínculo **encerrado** na data da despesa autoriza',
    esperado: '**Rejeitado** (vínculo não vigente)',
    etapa: 'B2',
  },
  {
    id: 'T20',
    cenario: 'Estimativa de consumo altera saldo de estoque',
    esperado: '**Nunca** — a projeção não movimenta (EC1)',
    etapa: 'B6',
  },
  {
    id: 'T21',
    cenario: 'Tesouraria tenta ler anamnese',
    esperado: '**403**',
    etapa: 'B4',
    camadaDePermissao: { grupo: 'TESOURARIA', permissoes: ['pessoas.anamnese.ler'], resultado: 'negada' },
  },
  {
    id: 'T22',
    cenario: 'Governança tenta ler anamnese',
    esperado: '**403**',
    etapa: 'B4',
    camadaDePermissao: { grupo: 'GOVERNANCA', permissoes: ['pessoas.anamnese.ler'], resultado: 'negada' },
  },
  {
    id: 'T23',
    cenario: 'Usuário da instituição A consulta dado da instituição B',
    esperado: '**Vazio** (RLS), não 403',
    etapa: 'B0',
  },
  {
    id: 'T24',
    cenario: 'Usuário sem grupo algum acessa qualquer endpoint',
    esperado: '**403** (US3)',
    etapa: 'B0',
  },
  {
    id: 'T25',
    cenario: 'Remover o último administrador ativo',
    esperado: '**Rejeitado** (US5)',
    etapa: 'B0',
  },
  {
    id: 'T26',
    cenario: 'Usuário desativado tenta autenticar',
    esperado: '**Rejeitado**',
    etapa: 'B0',
    lacunasDeclaradas: [{ marca: 'T26 · Keycloak', etapa: 'B0' }],
  },
  {
    id: 'T27',
    cenario: '`LEITURA` consulta lista nominal de participantes',
    esperado: '**403**',
    etapa: 'B5',
    camadaDePermissao: { grupo: 'LEITURA', permissoes: ['eventos.inscricao.ler'], resultado: 'negada' },
  },
  {
    id: 'T28',
    cenario: 'Busca no código por comparação com nome de grupo (`=== \'TESOURARIA\'`)',
    esperado: '**Nenhuma ocorrência** — lint',
    etapa: 'B0',
    idsDeTitulo: ['T28a', 'T28b'],
  },
  {
    id: 'T29',
    cenario: 'Toda permissão concedida a algum grupo existe no catálogo',
    esperado: '**Verdadeiro** (G4)',
    etapa: 'B0',
  },
  {
    id: 'T30',
    cenario: 'Todo endpoint de escrita tem decorator de permissão',
    esperado: '**Verdadeiro** — teste de metaprogramação sobre as rotas',
    etapa: 'B0',
  },
];

export const MARCAS_COBERTAS_NO_ACEITE: readonly string[] = ['T26 · Keycloak'];
