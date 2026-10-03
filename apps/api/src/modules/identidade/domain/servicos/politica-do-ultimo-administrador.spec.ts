import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import {
  PoliticaDoUltimoAdministrador,
  type MudancaProposta,
  type UsuarioDaInstituicao,
} from './politica-do-ultimo-administrador.js';

const ADMIN_1 = 'admin-1' as UsuarioId;
const ADMIN_2 = 'admin-2' as UsuarioId;
const COMUM = 'comum-1' as UsuarioId;
const FANTASMA = 'fantasma' as UsuarioId;

const ADMINISTRAR: ReadonlySet<Permissao> = new Set(['sistema.usuario.gerenciar']);
const SO_GRUPOS: ReadonlySet<Permissao> = new Set(['sistema.grupo.gerenciar']);
const NADA: ReadonlySet<Permissao> = new Set();

function usuario(
  id: UsuarioId,
  situacao: SituacaoUsuario,
  permissoesEfetivas: ReadonlySet<Permissao>,
): UsuarioDaInstituicao {
  return { id, situacao, permissoesEfetivas };
}

const politica = new PoliticaDoUltimoAdministrador();

function codigoDe(instituicao: readonly UsuarioDaInstituicao[], mudanca: MudancaProposta): string | undefined {
  const resultado = politica.verificar(instituicao, mudanca);
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

function trocarGrupos(
  autorId: UsuarioId,
  usuarioId: UsuarioId,
  permissoesResultantes: ReadonlySet<Permissao>,
): MudancaProposta {
  return { tipo: 'TROCAR_GRUPOS', autorId, usuarioId, permissoesResultantes };
}

function suspender(autorId: UsuarioId, usuarioId: UsuarioId): MudancaProposta {
  return { tipo: 'SUSPENDER', autorId, usuarioId };
}

describe('PoliticaDoUltimoAdministrador', () => {
  describe('US5: trocar grupos', () => {
    it('recusa quando o único administrador ativo perde a permissão, mesmo sendo o próprio autor', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', NADA)];

      expect(codigoDe(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, SO_GRUPOS))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('recusa quando outro usuário remove o único administrador', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', NADA)];

      expect(codigoDe(instituicao, trocarGrupos(COMUM, ADMIN_1, NADA))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('detalha autor e alvo no erro', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

      const resultado = politica.verificar(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA));

      expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({ autorId: ADMIN_1, usuarioId: ADMIN_1 });
    });

    it('aceita quando existem dois administradores ativos', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];

      expect(ehOk(politica.verificar(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA)))).toBe(true);
    });

    it('aceita quando o administrador continua administrador depois da troca', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

      expect(ehOk(politica.verificar(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, ADMINISTRAR)))).toBe(true);
    });

    it('aceita mudança em quem não é administrador', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', SO_GRUPOS)];

      expect(ehOk(politica.verificar(instituicao, trocarGrupos(ADMIN_1, COMUM, NADA)))).toBe(true);
    });

    it('aceita mudança em não administrador mesmo sem administrador ativo na instituição', () => {
      const instituicao = [usuario(COMUM, 'ATIVO', NADA)];

      expect(ehOk(politica.verificar(instituicao, trocarGrupos(COMUM, COMUM, SO_GRUPOS)))).toBe(true);
    });

    it('administrador suspenso não conta como outro administrador', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'SUSPENSO', ADMINISTRAR)];

      expect(codigoDe(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('convite pendente com permissão administrativa não conta', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'CONVITE_PENDENTE', ADMINISTRAR)];

      expect(codigoDe(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('usuário revogado não conta', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'REVOGADO', ADMINISTRAR)];

      expect(codigoDe(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('outro ativo sem permissão administrativa não conta', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', SO_GRUPOS)];

      expect(codigoDe(instituicao, trocarGrupos(ADMIN_1, ADMIN_1, NADA))).toBe('ULTIMO_ADMINISTRADOR');
    });
  });

  describe('US5: suspender', () => {
    it('recusa suspender o único administrador ativo, inclusive a si mesmo', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

      expect(codigoDe(instituicao, suspender(ADMIN_1, ADMIN_1))).toBe('ULTIMO_ADMINISTRADOR');
    });

    it('aceita suspender administrador quando há outro ativo', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];

      expect(ehOk(politica.verificar(instituicao, suspender(ADMIN_2, ADMIN_1)))).toBe(true);
    });

    it('aceita suspender quem não é administrador', () => {
      const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', SO_GRUPOS)];

      expect(ehOk(politica.verificar(instituicao, suspender(ADMIN_1, COMUM)))).toBe(true);
    });

    it('aceita suspender administrador que já não estava ativo', () => {
      const instituicao = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR)];

      expect(ehOk(politica.verificar(instituicao, suspender(COMUM, ADMIN_1)))).toBe(true);
    });
  });

  it('recusa alvo fora da instituição com USUARIO_DESCONHECIDO', () => {
    const instituicao = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

    expect(codigoDe(instituicao, suspender(ADMIN_1, FANTASMA))).toBe('USUARIO_DESCONHECIDO');
  });
});
