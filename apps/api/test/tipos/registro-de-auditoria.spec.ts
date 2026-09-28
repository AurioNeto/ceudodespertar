import type { RegistroAuditoriaId, RegistroDeAuditoria, UsuarioId } from '@cdd/contracts';
import { dataHora } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';

const id = <T extends string>(valor: string): T => valor as T;

const CAMPOS_COMUNS = {
  id: id<RegistroAuditoriaId>('aud-1'),
  em: dataHora('2026-09-27T00:00:00-03:00'),
  autorNome: 'Sistema',
  autorGrupo: 'Automação',
  operacao: 'USUARIO_ATIVADO',
  alvo: 'Usuário #1',
  referencia: null,
  detalhes: [],
  sensivel: false,
} as const;

describe('RegistroDeAuditoria — contrato de tipos do ator', () => {
  it('aceita autorTipo USUARIO com autorId preenchido', () => {
    const registro: RegistroDeAuditoria = {
      ...CAMPOS_COMUNS,
      autorTipo: 'USUARIO',
      autorId: id<UsuarioId>('usr-1'),
    };

    expect(registro.autorTipo).toBe('USUARIO');
  });

  it('aceita autorTipo SISTEMA com autorId nulo', () => {
    const registro: RegistroDeAuditoria = {
      ...CAMPOS_COMUNS,
      autorTipo: 'SISTEMA',
      autorId: null,
    };

    expect(registro.autorId).toBeNull();
  });

  it('recusa em tempo de compilação autorId preenchido fora de USUARIO', () => {
    // @ts-expect-error autorId só é UsuarioId quando autorTipo é USUARIO
    const registro: RegistroDeAuditoria = {
      ...CAMPOS_COMUNS,
      autorTipo: 'SISTEMA',
      autorId: id<UsuarioId>('usr-1'),
    };

    expect(registro.autorTipo).toBe('SISTEMA');
  });

  it('recusa em tempo de compilação autorId nulo quando autorTipo é USUARIO', () => {
    // @ts-expect-error autorId é UsuarioId obrigatório quando autorTipo é USUARIO
    const registro: RegistroDeAuditoria = {
      ...CAMPOS_COMUNS,
      autorTipo: 'USUARIO',
      autorId: null,
    };

    expect(registro.autorTipo).toBe('USUARIO');
  });
});
