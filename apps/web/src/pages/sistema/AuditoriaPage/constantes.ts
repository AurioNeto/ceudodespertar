import type { OperacaoAuditada } from '@cdd/contracts';

export const TODOS = '__todos__';

export interface FeicaoDaOperacao {
  readonly rotulo: string;
  /** Verbo curto para a linha: "estornou", "fechou", "abriu". */
  readonly verbo: string;
  readonly icone:
    | 'circle-check'
    | 'undo-2'
    | 'message-circle-question'
    | 'lock'
    | 'lock-open'
    | 'file-down'
    | 'file-spreadsheet'
    | 'shield-half'
    | 'key-round'
    | 'user-plus'
    | 'user-x'
    | 'clipboard-list'
    | 'eye'
    | 'scroll-text';
  readonly tom: 'neutro' | 'atencao' | 'sensivel';
}

export const FEICAO: Record<OperacaoAuditada, FeicaoDaOperacao> = {
  LANCAMENTO_CONFIRMADO: { rotulo: 'Lançamento consolidado', verbo: 'consolidou', icone: 'circle-check', tom: 'neutro' },
  LANCAMENTO_ESTORNADO: { rotulo: 'Lançamento estornado', verbo: 'estornou', icone: 'undo-2', tom: 'atencao' },
  PENDENCIA_ABERTA: { rotulo: 'Pendência aberta', verbo: 'devolveu com pendência', icone: 'message-circle-question', tom: 'neutro' },
  PERIODO_FECHADO: { rotulo: 'Período fechado', verbo: 'fechou', icone: 'lock', tom: 'neutro' },
  PERIODO_REABERTO: { rotulo: 'Período reaberto', verbo: 'reabriu', icone: 'lock-open', tom: 'atencao' },
  PRESTACAO_GERADA: { rotulo: 'Prestação de contas gerada', verbo: 'gerou', icone: 'file-down', tom: 'neutro' },
  EXTRATO_IMPORTADO: { rotulo: 'Extrato importado', verbo: 'importou', icone: 'file-spreadsheet', tom: 'neutro' },
  ADIANTAMENTO_AUTORIZADO: { rotulo: 'Adiantamento autorizado', verbo: 'autorizou', icone: 'shield-half', tom: 'neutro' },
  GRUPO_ALTERADO: { rotulo: 'Grupo de usuário alterado', verbo: 'mudou o grupo de', icone: 'key-round', tom: 'atencao' },
  GRUPO_EDITADO: { rotulo: 'Grupo editado', verbo: 'editou o grupo', icone: 'key-round', tom: 'atencao' },
  USUARIO_CONVIDADO: { rotulo: 'Usuário convidado', verbo: 'convidou', icone: 'user-plus', tom: 'neutro' },
  USUARIO_SUSPENSO: { rotulo: 'Usuário suspenso', verbo: 'suspendeu', icone: 'user-x', tom: 'atencao' },
  USUARIO_ATIVADO: { rotulo: 'Acesso ativado', verbo: 'ativou o acesso de', icone: 'circle-check', tom: 'neutro' },
  USUARIO_REATIVADO: { rotulo: 'Usuário reativado', verbo: 'reativou', icone: 'lock-open', tom: 'atencao' },
  FORMULARIO_PUBLICADO: { rotulo: 'Formulário publicado', verbo: 'publicou', icone: 'clipboard-list', tom: 'neutro' },
  PESSOA_ANONIMIZADA: { rotulo: 'Pessoa anonimizada', verbo: 'anonimizou', icone: 'user-x', tom: 'atencao' },
  ANAMNESE_LIDA: { rotulo: 'Anamnese lida', verbo: 'abriu a anamnese de', icone: 'eye', tom: 'sensivel' },
  AUDITORIA_CONSULTADA: { rotulo: 'Auditoria consultada', verbo: 'consultou', icone: 'scroll-text', tom: 'sensivel' },
};

/** Operações cujo registro extra o domínio exige — Doc 3 §10.4. */
export const EXIGE_REGISTRO_EXTRA: Partial<Record<OperacaoAuditada, string>> = {
  LANCAMENTO_ESTORNADO: 'motivo textual obrigatório',
  PERIODO_REABERTO: 'motivo textual obrigatório',
  GRUPO_ALTERADO: 'grupo anterior, grupo novo e autor',
  PRESTACAO_GERADA: 'período, nível, hash e autor',
  PESSOA_ANONIMIZADA: 'autor e base legal invocada',
  PENDENCIA_ABERTA: 'texto, autor e destinatário',
  ANAMNESE_LIDA: 'quem leu, de quem e quando',
};

export const CONTEXTO_ROTULO: Record<'INSCRICAO' | 'REVISAO' | 'ATENDIMENTO', string> = {
  INSCRICAO: 'Inscrição',
  REVISAO: 'Revisão de fila',
  ATENDIMENTO: 'Atendimento',
};
