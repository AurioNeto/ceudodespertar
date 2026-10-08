import type { Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import { PermissoesEfetivas } from '../permissao/permissoes-efetivas.js';
import { Usuario } from '../usuario/usuario.js';
import { PoliticaDoUltimoAdministrador, UsuarioDaInstituicao } from './politica-do-ultimo-administrador.js';

const ADMIN_1 = 'admin-1' as UsuarioId;
const ADMIN_2 = 'admin-2' as UsuarioId;
const COMUM = 'comum-1' as UsuarioId;

const ADMINISTRAR: ReadonlySet<Permissao> = new Set(['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']);
const SO_USUARIOS: ReadonlySet<Permissao> = new Set(['sistema.usuario.gerenciar']);
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
      permissao: 'sistema.usuario.gerenciar',
      administradoresAfetados: [ADMIN_1, ADMIN_2],
    });
  });

  it('recusa quando a mudança zera só quem gerencia grupos, ainda que sobrem quem gerencia usuários', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', SO_USUARIOS)];
    const depois = [usuario(ADMIN_1, 'ATIVO', SO_USUARIOS), usuario(ADMIN_2, 'ATIVO', SO_USUARIOS)];

    const resultado = politica.verificar(antes, depois, ADMIN_1);

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'ULTIMO_ADMINISTRADOR',
      detalhes: { autorId: ADMIN_1, permissao: 'sistema.grupo.gerenciar', administradoresAfetados: [ADMIN_1] },
    });
  });

  it('recusa quando a mudança zera só quem gerencia usuários, ainda que sobrem quem gerencia grupos', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_2, 'ATIVO', SO_GRUPOS)];
    const depois = [usuario(ADMIN_1, 'ATIVO', SO_GRUPOS), usuario(ADMIN_2, 'ATIVO', SO_GRUPOS)];

    const resultado = politica.verificar(antes, depois, ADMIN_1);

    expect(ehErr(resultado) && resultado.erro.detalhes).toMatchObject({ permissao: 'sistema.usuario.gerenciar' });
  });

  it('recusa a suspensão do único ativo que gerencia grupos', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', SO_GRUPOS), usuario(ADMIN_2, 'ATIVO', SO_USUARIOS)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', SO_GRUPOS), usuario(ADMIN_2, 'ATIVO', SO_USUARIOS)];

    expect(codigoDe(antes, depois)).toBe('ULTIMO_ADMINISTRADOR');
  });

  it('aceita quando a instituição já estava sem ativo que gerencie grupos, porque nada piorou', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', SO_USUARIOS)];
    const depois = [usuario(ADMIN_1, 'ATIVO', SO_USUARIOS), usuario(COMUM, 'ATIVO', NADA)];

    expect(ehOk(politica.verificar(antes, depois, ADMIN_1))).toBe(true);
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

  it('linhas conflitantes do mesmo id no estado são erro de programação, não aprovação', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR)];

    expect(() => politica.verificar(antes, depois, ADMIN_1)).toThrow(RangeError);
  });

  it('linhas repetidas do mesmo id contam como um só administrador', () => {
    const antes = [usuario(ADMIN_1, 'ATIVO', ADMINISTRAR), usuario(ADMIN_1, 'ATIVO', ADMINISTRAR)];
    const depois = [usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR), usuario(ADMIN_1, 'SUSPENSO', ADMINISTRAR)];

    const resultado = politica.verificar(antes, depois, ADMIN_1);

    expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({
      autorId: ADMIN_1,
      permissao: 'sistema.usuario.gerenciar',
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

describe('UsuarioDaInstituicao.de', () => {
  function usuarioReal(situacao: SituacaoUsuario): Usuario {
    return Usuario.reconstituir({
      id: ADMIN_1,
      pessoaId: null,
      subjectId: 'sub-1',
      nome: 'Maria Silva',
      email: 'maria@casa.org',
      situacao,
      grupos: [],
      ativadoEm: null,
      suspensoEm: null,
      ultimoAcessoEm: null,
      convite: null,
    });
  }

  it('monta a entrada da política a partir de um Usuario e de PermissoesEfetivas reais', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([
      { ativo: true, permissoes: ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'] },
    ]);

    const entrada = UsuarioDaInstituicao.de(usuarioReal('ATIVO'), efetivas);

    expect(entrada.id).toBe(ADMIN_1);
    expect(entrada.situacao).toBe('ATIVO');
    expect([...entrada.permissoesEfetivas].toSorted()).toStrictEqual(efetivas.lista);
  });

  it('aceita um tipo estrutural com só id e situação, sem o agregado', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([{ ativo: true, permissoes: ['sistema.grupo.gerenciar'] }]);

    const entrada = UsuarioDaInstituicao.de({ id: COMUM, situacao: 'SUSPENSO' }, efetivas);

    expect(entrada).toEqual({ id: COMUM, situacao: 'SUSPENSO', permissoesEfetivas: new Set(['sistema.grupo.gerenciar']) });
  });

  it('a entrada convertida alimenta a política', () => {
    const administrador = PermissoesEfetivas.dosGrupos([{ ativo: true, permissoes: ['sistema.usuario.gerenciar'] }]);
    const semPermissao = PermissoesEfetivas.dosGrupos([]);
    const antes = [UsuarioDaInstituicao.de(usuarioReal('ATIVO'), administrador)];
    const depois = [UsuarioDaInstituicao.de(usuarioReal('ATIVO'), semPermissao)];

    expect(codigoDe(antes, depois)).toBe('ULTIMO_ADMINISTRADOR');
  });
});
