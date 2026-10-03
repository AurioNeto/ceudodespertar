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
const NOME = 'Maria Silva';
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
    nome: NOME,
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
      nome: NOME,
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
    expect(usuario.nome).toBe(NOME);
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

  it('não leva o hash do convite para os dados do evento', () => {
    const [evento] = convidado().retirarEventos();

    expect(JSON.stringify(evento?.dados)).not.toContain(HASH);
  });

  it('data de expiração inválida é erro de programação', () => {
    expect(() =>
      Usuario.convidar({
        id: USUARIO_ID,
        nome: NOME,
        email: 'maria@casa.org',
        grupos: [GRUPO_A],
        hashDoConvite: HASH,
        conviteExpiraEm: new Date('inválida'),
        convidadoPor: ADMIN_ID,
        em: AGORA,
      }),
    ).toThrow(RangeError);
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
        nome: NOME,
        email: 'maria@casa.org',
        situacao: 'ATIVO',
        grupos: [GRUPO_B],
        ultimoAcessoEm: AGORA,
        convite: null,
      },
      7,
    );

    expect(usuario).toMatchObject({
      situacao: 'ATIVO',
      pessoaId: 'pessoa-1',
      subjectId: SUBJECT,
      nome: NOME,
      versao: 7,
    });
    expect(usuario.grupos).toEqual([GRUPO_B]);
    expect(usuario.ultimoAcessoEm).toEqual(AGORA);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('nasce na versão 1 quando a versão não é informada', () => {
    const { versao } = Usuario.reconstituir({
      id: USUARIO_ID,
      pessoaId: null,
      subjectId: null,
      nome: NOME,
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
    usuario.ativar(HASH, SUBJECT, AGORA);

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
  it('troca hash e expiração e guarda o convite substituído já revogado', () => {
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
        dados: { autorId: ADMIN_ID, email: 'maria@casa.org' },
      },
    ]);
    expect(usuario.convitesSubstituidos).toHaveLength(1);
    expect(usuario.convitesSubstituidos[0]).toMatchObject({ hashDoToken: HASH, revogadoEm: DEPOIS, usadoEm: null });
  });

  it('não leva hash algum para os dados do evento de reenvio', () => {
    const usuario = convidado();
    usuario.retirarEventos();

    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    const [evento] = usuario.retirarEventos();
    expect(JSON.stringify(evento?.dados)).not.toContain(HASH);
    expect(JSON.stringify(evento?.dados)).not.toContain(NOVO_HASH);
  });

  it('acumula os convites substituídos em reenvios sucessivos', () => {
    const usuario = convidado();

    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);
    usuario.reenviarConvite('hash-3', NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(usuario.convitesSubstituidos.map((convite) => convite.hashDoToken)).toEqual([HASH, NOVO_HASH]);
  });

  it('expõe cópia dos convites substituídos', () => {
    const usuario = convidado();
    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    (usuario.convitesSubstituidos as Convite[]).pop();

    expect(usuario.convitesSubstituidos).toHaveLength(1);
  });

  it('data de expiração inválida é erro de programação e não altera o usuário', () => {
    const usuario = convidado();

    expect(() => usuario.reenviarConvite(NOVO_HASH, new Date('inválida'), ADMIN_ID, DEPOIS)).toThrow(RangeError);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
  });

  it('funciona também quando não havia convite anterior', () => {
    const usuario = emSituacao('CONVITE_PENDENTE', null);

    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(usuario.convite?.hashDoToken).toBe(NOVO_HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
  });

  it.each([
    ['ATIVO', 'CONVITE_JA_USADO'],
    ['SUSPENSO', 'USUARIO_SUSPENSO'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa reenvio para usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS))).toBe(codigo);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.ativar', () => {
  it('instante inválido ou subjectId vazio são erro de programação e não ativam', () => {
    const usuario = convidado();

    expect(() => usuario.ativar(HASH, SUBJECT, new Date(Number.NaN))).toThrow(RangeError);
    expect(() => usuario.ativar(HASH, '  ', DEPOIS)).toThrow(RangeError);
    expect(usuario.situacao).toBe('CONVITE_PENDENTE');
  });

  it('ativa a partir de CONVITE_PENDENTE, preenche o subjectId e consome o convite', () => {
    const usuario = convidado();
    usuario.retirarEventos();

    const resultado = usuario.ativar(HASH, SUBJECT, DEPOIS);

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

  it('sem convite registrado dá CONVITE_INVALIDO e não ativa', () => {
    const usuario = emSituacao('CONVITE_PENDENTE', null);

    expect(codigoDe(usuario.ativar(HASH, SUBJECT, DEPOIS))).toBe('CONVITE_INVALIDO');
    expect(usuario.situacao).toBe('CONVITE_PENDENTE');
    expect(usuario.subjectId).toBeNull();
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it.each([
    ['hash que não é o do convite', 'x', DEPOIS, Convite.criar(HASH, EXPIRA_EM), 'CONVITE_INVALIDO'],
    ['convite expirado', HASH, NOVA_EXPIRA_EM, Convite.criar(HASH, EXPIRA_EM), 'CONVITE_EXPIRADO'],
    ['convite já usado', HASH, DEPOIS, Convite.criar(HASH, EXPIRA_EM).usar(AGORA), 'CONVITE_JA_USADO'],
    ['convite revogado', HASH, DEPOIS, Convite.criar(HASH, EXPIRA_EM).revogar(AGORA), 'CONVITE_INVALIDO'],
  ] as const)('recusa ativar com %s e deixa o usuário intacto', (_descricao, hash, em, convite, codigo) => {
    const usuario = emSituacao('CONVITE_PENDENTE', convite);

    expect(codigoDe(usuario.ativar(hash, SUBJECT, em))).toBe(codigo);
    expect(usuario.situacao).toBe('CONVITE_PENDENTE');
    expect(usuario.subjectId).toBeNull();
    expect(usuario.convite?.usadoEm ?? null).toEqual(convite.usadoEm);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('o hash antigo não ativa depois do reenvio', () => {
    const usuario = convidado();
    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    expect(codigoDe(usuario.ativar(HASH, SUBJECT, DEPOIS))).toBe('CONVITE_INVALIDO');
    expect(ehOk(usuario.ativar(NOVO_HASH, SUBJECT, DEPOIS))).toBe(true);
  });

  it.each([
    ['ATIVO', 'CONVITE_JA_USADO'],
    ['SUSPENSO', 'USUARIO_SUSPENSO'],
    ['REVOGADO', 'USUARIO_REVOGADO'],
  ] as const)('recusa ativar usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.ativar(HASH, 'outro-sub', DEPOIS))).toBe(codigo);
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

  it('detecta mudança quando só se adiciona um grupo', () => {
    const usuario = convidado([GRUPO_A]);
    usuario.retirarEventos();

    usuario.definirGrupos([GRUPO_A, GRUPO_B], ADMIN_ID, DEPOIS);

    expect(usuario.grupos).toEqual([GRUPO_A, GRUPO_B]);
    expect(usuario.retirarEventos()).toMatchObject([
      { dados: { gruposAntes: [GRUPO_A], gruposDepois: [GRUPO_A, GRUPO_B] } },
    ]);
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
