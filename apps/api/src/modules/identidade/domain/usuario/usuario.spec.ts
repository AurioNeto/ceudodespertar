import type { GrupoId, PessoaId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ehErr, ehOk, type Result } from '../../../../shared/kernel/result.js';
import { Convite } from './convite.js';
import { Usuario } from './usuario.js';

const USUARIO_ID = 'usuario-1' as UsuarioId;
const ADMIN_ID = 'admin-1' as UsuarioId;
const GRUPO_A = 'grupo-a' as GrupoId;
const GRUPO_B = 'grupo-b' as GrupoId;
const GRUPO_C = 'grupo-c' as GrupoId;
const HASH = 'hash-1';
const NOVO_HASH = 'hash-2';
const AGORA = new Date('2026-03-01T10:00:00Z');
const DEPOIS = new Date('2026-03-02T10:00:00Z');
const EXPIRA_EM = new Date('2026-03-08T10:00:00Z');
const NOVA_EXPIRA_EM = new Date('2026-03-15T10:00:00Z');
const SUBJECT = 'sub-keycloak-1';

function convidado(grupos: readonly GrupoId[] = [GRUPO_A]): Usuario {
  return Usuario.convidar({
    id: USUARIO_ID,
    email: 'maria@casa.org',
    grupos,
    hashDoConvite: HASH,
    conviteExpiraEm: EXPIRA_EM,
    convidadoPor: ADMIN_ID,
    em: AGORA,
  });
}

function emSituacao(situacao: SituacaoUsuario, convite: Convite | null = Convite.criar(HASH, EXPIRA_EM)): Usuario {
  return Usuario.reconstituir(
    {
      id: USUARIO_ID,
      pessoaId: null,
      subjectId: situacao === 'CONVITE_PENDENTE' ? null : SUBJECT,
      email: 'maria@casa.org',
      situacao,
      grupos: [GRUPO_A],
      ultimoAcessoEm: null,
      convite,
    },
    3,
  );
}

function ativo(): Usuario {
  return emSituacao('ATIVO');
}

function codigoDe(resultado: Result<unknown, ErroDeDominio>): string | undefined {
  return ehErr(resultado) ? resultado.erro.codigo : undefined;
}

describe('Usuario.convidar', () => {
  it('nasce com convite pendente, sem pessoa e sem subjectId', () => {
    const usuario = convidado();

    expect(usuario.situacao).toBe('CONVITE_PENDENTE');
    expect(usuario.pessoaId).toBeNull();
    expect(usuario.subjectId).toBeNull();
    expect(usuario.ultimoAcessoEm).toBeNull();
    expect(usuario.email).toBe('maria@casa.org');
    expect(usuario.grupos).toEqual([GRUPO_A]);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convite?.expiraEm).toEqual(EXPIRA_EM);
  });

  it('registra USUARIO_CONVIDADO com o autor do convite', () => {
    const [evento, ...restantes] = convidado().retirarEventos();

    expect(restantes).toEqual([]);
    expect(evento).toMatchObject({
      tipo: 'USUARIO_CONVIDADO',
      ocorridoEm: AGORA,
      agregadoTipo: 'Usuario',
      agregadoId: USUARIO_ID,
      dados: { autorId: ADMIN_ID, email: 'maria@casa.org' },
    });
  });

  it('não guarda duplicatas de grupo', () => {
    expect(convidado([GRUPO_A, GRUPO_A, GRUPO_B]).grupos).toEqual([GRUPO_A, GRUPO_B]);
  });
});

describe('Usuario.reconstituir', () => {
  it('restaura o estado persistido sem gerar eventos', () => {
    const usuario = Usuario.reconstituir(
      {
        id: USUARIO_ID,
        pessoaId: 'pessoa-1' as PessoaId,
        subjectId: SUBJECT,
        email: 'maria@casa.org',
        situacao: 'ATIVO',
        grupos: [GRUPO_B],
        ultimoAcessoEm: AGORA,
        convite: null,
      },
      7,
    );

    expect(usuario).toMatchObject({ situacao: 'ATIVO', pessoaId: 'pessoa-1', subjectId: SUBJECT, versao: 7 });
    expect(usuario.grupos).toEqual([GRUPO_B]);
    expect(usuario.ultimoAcessoEm).toEqual(AGORA);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('nasce na versão 1 quando a versão não é informada', () => {
    const { versao } = Usuario.reconstituir({
      id: USUARIO_ID,
      pessoaId: null,
      subjectId: null,
      email: 'a@b.c',
      situacao: 'CONVITE_PENDENTE',
      grupos: [],
      ultimoAcessoEm: null,
      convite: null,
    });

    expect(versao).toBe(1);
  });

  it('expõe cópia dos grupos, sem permitir mutação externa', () => {
    const usuario = ativo();

    (usuario.grupos as GrupoId[]).push(GRUPO_C);

    expect(usuario.grupos).toEqual([GRUPO_A]);
  });
});

describe('Usuario.validarConvite', () => {
  it('aceita o hash do convite vigente', () => {
    expect(ehOk(convidado().validarConvite(HASH, AGORA))).toBe(true);
  });

  it('CONVITE_EXPIRADO depois da expiração', () => {
    expect(codigoDe(convidado().validarConvite(HASH, NOVA_EXPIRA_EM))).toBe('CONVITE_EXPIRADO');
  });

  it('CONVITE_INVALIDO para hash que não é o do convite', () => {
    expect(codigoDe(convidado().validarConvite('x', AGORA))).toBe('CONVITE_INVALIDO');
  });

  it('CONVITE_INVALIDO quando o usuário não tem convite', () => {
    expect(codigoDe(emSituacao('CONVITE_PENDENTE', null).validarConvite(HASH, AGORA))).toBe('CONVITE_INVALIDO');
  });

  it('CONVITE_JA_USADO depois da ativação', () => {
    const usuario = convidado();
    usuario.ativar(SUBJECT, AGORA);

    expect(codigoDe(usuario.validarConvite(HASH, AGORA))).toBe('CONVITE_JA_USADO');
  });

  it('CONVITE_INVALIDO para o hash antigo depois do reenvio', () => {
    const usuario = convidado();
    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(codigoDe(usuario.validarConvite(HASH, DEPOIS))).toBe('CONVITE_INVALIDO');
    expect(ehOk(usuario.validarConvite(NOVO_HASH, DEPOIS))).toBe(true);
  });
});

describe('Usuario.reenviarConvite', () => {
  it('troca hash e expiração e registra o hash revogado', () => {
    const usuario = convidado();
    usuario.retirarEventos();

    const resultado = usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.situacao).toBe('CONVITE_PENDENTE');
    expect(usuario.convite?.hashDoToken).toBe(NOVO_HASH);
    expect(usuario.convite?.expiraEm).toEqual(NOVA_EXPIRA_EM);
    expect(usuario.retirarEventos()).toMatchObject([
      {
        tipo: 'USUARIO_CONVIDADO',
        ocorridoEm: DEPOIS,
        dados: { autorId: ADMIN_ID, hashDoConviteRevogado: HASH },
      },
    ]);
  });

  it('funciona também quando não havia convite anterior', () => {
    const usuario = emSituacao('CONVITE_PENDENTE', null);

    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(usuario.convite?.hashDoToken).toBe(NOVO_HASH);
    expect(usuario.retirarEventos()).toMatchObject([{ dados: { hashDoConviteRevogado: null } }]);
  });

  it.each([
    ['ATIVO', 'CONVITE_JA_USADO'],
    ['SUSPENSO', 'USUARIO_SUSPENSO'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa reenvio para usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS))).toBe(codigo);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.ativar', () => {
  it('ativa a partir de CONVITE_PENDENTE, preenche o subjectId e consome o convite', () => {
    const usuario = convidado();
    usuario.retirarEventos();

    const resultado = usuario.ativar(SUBJECT, DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.subjectId).toBe(SUBJECT);
    expect(usuario.convite?.usadoEm).toEqual(DEPOIS);
    expect(usuario.retirarEventos()).toMatchObject([
      {
        tipo: 'USUARIO_ATIVADO',
        ocorridoEm: DEPOIS,
        agregadoId: USUARIO_ID,
        dados: { autorId: USUARIO_ID, subjectId: SUBJECT },
      },
    ]);
  });

  it('ativa mesmo sem convite registrado', () => {
    const usuario = emSituacao('CONVITE_PENDENTE', null);

    expect(ehOk(usuario.ativar(SUBJECT, DEPOIS))).toBe(true);
    expect(usuario.convite).toBeNull();
  });

  it.each([
    ['ATIVO', 'CONVITE_JA_USADO'],
    ['SUSPENSO', 'USUARIO_SUSPENSO'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa ativar usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.ativar('outro-sub', DEPOIS))).toBe(codigo);
    expect(usuario.situacao).toBe(situacao);
    expect(usuario.subjectId).toBe(SUBJECT);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.desativar', () => {
  it('suspende usuário ATIVO e registra autor, motivo e instante', () => {
    const usuario = ativo();

    const resultado = usuario.desativar(ADMIN_ID, 'saiu da casa', DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(usuario.retirarEventos()).toMatchObject([
      { tipo: 'USUARIO_SUSPENSO', ocorridoEm: DEPOIS, dados: { autorId: ADMIN_ID, motivo: 'saiu da casa' } },
    ]);
  });

  it.each(['', '   '])('exige motivo: %j dá MOTIVO_OBRIGATORIO', (motivo) => {
    const usuario = ativo();

    expect(codigoDe(usuario.desativar(ADMIN_ID, motivo, DEPOIS))).toBe('MOTIVO_OBRIGATORIO');
    expect(usuario.situacao).toBe('ATIVO');
  });

  it('desativar usuário já SUSPENSO é idempotente: ok, sem evento', () => {
    const usuario = emSituacao('SUSPENSO');

    expect(ehOk(usuario.desativar(ADMIN_ID, 'de novo', DEPOIS))).toBe(true);
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it.each([
    ['CONVITE_PENDENTE', 'USUARIO_CONVITE_PENDENTE'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa desativar usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.desativar(ADMIN_ID, 'motivo', DEPOIS))).toBe(codigo);
    expect(usuario.situacao).toBe(situacao);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.reativar', () => {
  it('volta de SUSPENSO para ATIVO com USUARIO_REATIVADO e autor', () => {
    const usuario = emSituacao('SUSPENSO');

    const resultado = usuario.reativar(ADMIN_ID, DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.retirarEventos()).toMatchObject([
      { tipo: 'USUARIO_REATIVADO', ocorridoEm: DEPOIS, dados: { autorId: ADMIN_ID } },
    ]);
  });

  it('reativar usuário já ATIVO é idempotente: ok, sem evento', () => {
    const usuario = ativo();
    usuario.retirarEventos();

    expect(ehOk(usuario.reativar(ADMIN_ID, DEPOIS))).toBe(true);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it.each([
    ['CONVITE_PENDENTE', 'USUARIO_CONVITE_PENDENTE'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa reativar usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.reativar(ADMIN_ID, DEPOIS))).toBe(codigo);
    expect(usuario.situacao).toBe(situacao);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('desativar e reativar preservam subjectId e grupos', () => {
    const usuario = ativo();

    usuario.desativar(ADMIN_ID, 'pausa', AGORA);
    usuario.reativar(ADMIN_ID, DEPOIS);

    expect(usuario.subjectId).toBe(SUBJECT);
    expect(usuario.grupos).toEqual([GRUPO_A]);
  });
});

describe('US4: usuário inativo não autentica', () => {
  it('ATIVO passa', () => {
    expect(ehOk(ativo().verificarAcesso())).toBe(true);
  });

  it.each([
    ['CONVITE_PENDENTE', 'USUARIO_CONVITE_PENDENTE'],
    ['SUSPENSO', 'USUARIO_SUSPENSO'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('%s dá %s', (situacao, codigo) => {
    expect(codigoDe(emSituacao(situacao).verificarAcesso())).toBe(codigo);
  });
});

describe('Usuario.definirGrupos', () => {
  it('US6: registra autor, instante e grupos antes e depois', () => {
    const usuario = ativo();

    const resultado = usuario.definirGrupos([GRUPO_B, GRUPO_C], ADMIN_ID, DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.grupos).toEqual([GRUPO_B, GRUPO_C]);
    expect(usuario.retirarEventos()).toMatchObject([
      {
        tipo: 'GRUPO_ALTERADO',
        ocorridoEm: DEPOIS,
        agregadoId: USUARIO_ID,
        dados: { autorId: ADMIN_ID, gruposAntes: [GRUPO_A], gruposDepois: [GRUPO_B, GRUPO_C] },
      },
    ]);
  });

  it('não registra evento quando o conjunto de grupos não muda, mesmo em outra ordem', () => {
    const usuario = convidado([GRUPO_A, GRUPO_B]);
    usuario.retirarEventos();

    usuario.definirGrupos([GRUPO_B, GRUPO_A, GRUPO_A], ADMIN_ID, DEPOIS);

    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('detecta mudança quando só o tamanho do conjunto difere', () => {
    const usuario = convidado([GRUPO_A, GRUPO_B]);
    usuario.retirarEventos();

    usuario.definirGrupos([GRUPO_A], ADMIN_ID, DEPOIS);

    expect(usuario.grupos).toEqual([GRUPO_A]);
    expect(usuario.retirarEventos()).toHaveLength(1);
  });

  it('aceita remover todos os grupos', () => {
    const usuario = ativo();

    usuario.definirGrupos([], ADMIN_ID, DEPOIS);

    expect(usuario.grupos).toEqual([]);
  });

  it.each(['CONVITE_PENDENTE', 'SUSPENSO'] as const)('permite definir grupos de usuário %s', (situacao) => {
    expect(ehOk(emSituacao(situacao).definirGrupos([GRUPO_B], ADMIN_ID, DEPOIS))).toBe(true);
  });

  it('recusa definir grupos de usuário REVOGADO', () => {
    const usuario = emSituacao('REVOGADO');

    expect(codigoDe(usuario.definirGrupos([GRUPO_B], ADMIN_ID, DEPOIS))).toBe('USUARIO_REVOGADO');
    expect(usuario.grupos).toEqual([GRUPO_A]);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario × pessoa', () => {
  it.todo('US1: todo usuário referencia uma pessoa existente e ativa (etapa B1)');
});
