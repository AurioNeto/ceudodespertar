import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import { PoliticaDoUltimoAdministrador, type UsuarioDaInstituicao } from './politica-do-ultimo-administrador.js';

const ADMIN_1 = 'admin-1' as UsuarioId;
const ADMIN_2 = 'admin-2' as UsuarioId;
const COMUM = 'comum-1' as UsuarioId;

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

function codigoDe(
  antes: readonly UsuarioDaInstituicao[],
  depois: readonly UsuarioDaInstituicao[],
  autorId: UsuarioId = ADMIN_1,
): string | undefined {
  const resultado = politica.verificar(antes, depois, autorId);
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

describe('PoliticaDoUltimoAdministrador (US5)', () => {
  it('recusa quando o único administrador ativo perde a permissão', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', NADA)];
    const depois = [usuario(ADMIN_1, 'ATIVO', SO_GRUPOS), usuario(COMUM, 'ATIVO', NADA)];

    expect(codigoDe(antes, depois)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('recusa a autossuspensão do único administrador', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR)];

    expect(codigoDe(antes, depois, ADMIN_1)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('recusa quando a revogação da permissão no grupo atinge todos os administradores', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'ATIVO', NADA), usuario(ADMIN_2, 'ATIVO', NADA)];

    expect(codigoDe(antes, depois, COMUM)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('detalha o autor, distinto do alvo, e os administradores que perderam a condição', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'ATIVO', NADA), usuario(ADMIN_2, 'SUSPENSO', ADMINISTRAR)];

    const resultado = politica.verificar(antes, depois, COMUM);

    expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({
      autorId: COMUM,
      administradoresAfetados: [ADMIN_1, ADMIN_2],
    });
  });

  it('aceita quando um de dois administradores sai', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', ADMINISTRAR)];

    expect(ehOk(politica.verificar(antes, depois, ADMIN_1))).toBe(true);
  });

  it('aceita mudança em quem não é administrador', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', SO_GRUPOS)];
    const depois = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'SUSPENSO', NADA)];

    expect(ehOk(politica.verificar(antes, depois, ADMIN_1))).toBe(true);
  });

  it('aceita quando a instituição já estava sem administrador ativo, porque nada piorou', () => {
    const antes = [usuario(COMUM, 'ATIVO', NADA)];
    const depois = [usuario(COMUM, 'ATIVO', SO_GRUPOS)];

    expect(ehOk(politica.verificar(antes, depois, COMUM))).toBe(true);
  });

  it('aceita quando o administrador continua administrador', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

    expect(ehOk(politica.verificar(antes, depois, ADMIN_1))).toBe(true);
  });

  it('aceita quando a mudança promove um novo administrador no lugar do que sai', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', NADA)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR), usuario(COMUM, 'ATIVO', ADMINISTRAR)];

    expect(ehOk(politica.verificar(antes, depois, ADMIN_1))).toBe(true);
  });

  it('linhas repetidas do mesmo id contam como um só administrador', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR), usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR)];

    const resultado = politica.verificar(antes, depois, ADMIN_1);

    expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({
      autorId: ADMIN_1,
      administradoresAfetados: [ADMIN_1],
    });
  });

  it.each([
    ['SUSPENSO'],
    ['CONVITE_PENDENTE'],
    ['REVOGADO'],
  ] as const)('usuário %s com permissão administrativa não conta como administrador', (situacao) => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, situacao, ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'ATIVO', NADA), usuario(ADMIN_2, situacao, ADMINISTRAR)];

    expect(codigoDe(antes, depois)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('outro ativo sem permissão administrativa não conta', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(COMUM, 'ATIVO', SO_GRUPOS)];
    const depois = [usuario(ADMIN_1, 'ATIVO', NADA), usuario(COMUM, 'ATIVO', SO_GRUPOS)];

    expect(codigoDe(antes, depois)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('administrador ausente do estado depois deixa de contar', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];

    expect(codigoDe(antes, [])).toBe('ULTIMO_ADMINISTRADOR');
  });
});
