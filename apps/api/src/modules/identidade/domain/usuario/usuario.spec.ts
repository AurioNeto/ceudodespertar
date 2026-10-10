import type { GrupoId, PessoaId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ehErr, ehOk, type Result } from '../../../../shared/kernel/result.js';
import { Convite } from './convite.js';
import { LIMITE_DE_CARACTERES_DO_MOTIVO, Usuario } from './usuario.js';

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
const EXPIRA_EM = new Date('2026-03-04T10:00:00Z');
const NOVA_EXPIRA_EM = new Date('2026-03-05T10:00:00Z');
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

function emSituacao(situacao: SituacaoUsuario, convite: Convite | null = Convite.criar(HASH, EXPIRA_EM, ADMIN_ID, AGORA)): Usuario {
  return Usuario.reconstituir(
    {
      id: USUARIO_ID,
      pessoaId: null,
      subjectId: situacao === 'CONVITE_PENDENTE' ? null : SUBJECT,
      nome: NOME,
      email: 'maria@casa.org',
      situacao,
      grupos: [GRUPO_A],
      ativadoEm: null,
      suspensoEm: null,
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
        ativadoEm: null,
        suspensoEm: null,
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
      ativadoEm: null,
      suspensoEm: null,
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
    usuario.reenviarConvite('hash-3', NOVA_EXPIRA_EM, ADMIN_ID, new Date(DEPOIS.getTime() + 60_000));

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
    ['SUSPENSO', 'SITUACAO_DO_USUARIO_NAO_PERMITE'],
    ['REVOGADO', 'SITUACAO_DO_USUARIO_NAO_PERMITE'],
  ] as const)('recusa reenvio para usuário %s com %s', (situacao, codigo) => {
    const usuario = emSituacao(situacao);

    expect(codigoDe(usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS))).toBe(codigo);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.reenviarConvite — intervalo mínimo', () => {
  const MS_POR_SEGUNDO = 1_000;
  const aposSegundos = (segundos: number) => new Date(AGORA.getTime() + segundos * MS_POR_SEGUNDO);
  const detalhesDe = (resultado: Result<unknown, ErroDeDominio>) => (resultado.tipo === 'erro' ? resultado.erro.detalhes : undefined);

  it('recusa aos 59 s e não altera o usuário', () => {
    const usuario = convidado();
    usuario.retirarEventos();

    const resultado = usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, aposSegundos(59));

    expect(codigoDe(resultado)).toBe('CONVITE_REENVIADO_RECENTEMENTE');
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('aceita aos 60 s exatos', () => {
    const expiraEm = aposSegundos(24 * 3_600);

    expect(ehOk(convidado().reenviarConvite(NOVO_HASH, expiraEm, ADMIN_ID, aposSegundos(60)))).toBe(true);
  });

  it.each([
    [59, 1],
    [30, 30],
    [0, 60],
  ])('aos %i s informa %i s restantes', (decorridos, restantes) => {
    const resultado = convidado().reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, aposSegundos(decorridos));

    expect(detalhesDe(resultado)).toEqual({ retryAfterSegundos: restantes });
  });

  it.each([
    [30_500, 30],
    [59_001, 1],
  ])('arredonda para cima: aos %i ms informa %i s', (decorridoEmMs, restantes) => {
    const resultado = convidado().reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, new Date(AGORA.getTime() + decorridoEmMs));

    expect(detalhesDe(resultado)).toEqual({ retryAfterSegundos: restantes });
  });

  it('relógio anterior ao convite não passa de 60 s de espera', () => {
    const resultado = convidado().reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, aposSegundos(-600));

    expect(detalhesDe(resultado)).toEqual({ retryAfterSegundos: 60 });
  });

  it('mede a partir do convite vigente, não do primeiro', () => {
    const usuario = convidado();
    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, ADMIN_ID, DEPOIS);

    const resultado = usuario.reenviarConvite('hash-3', NOVA_EXPIRA_EM, ADMIN_ID, new Date(DEPOIS.getTime() + 10_000));

    expect(detalhesDe(resultado)).toEqual({ retryAfterSegundos: 50 });
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
    ['hash que não é o do convite', 'x', DEPOIS, Convite.criar(HASH, EXPIRA_EM, ADMIN_ID, AGORA), 'CONVITE_INVALIDO'],
    ['convite expirado', HASH, NOVA_EXPIRA_EM, Convite.criar(HASH, EXPIRA_EM, ADMIN_ID, AGORA), 'CONVITE_EXPIRADO'],
    ['convite já usado', HASH, DEPOIS, Convite.criar(HASH, EXPIRA_EM, ADMIN_ID, AGORA).usar(AGORA), 'CONVITE_JA_USADO'],
    ['convite revogado', HASH, DEPOIS, Convite.criar(HASH, EXPIRA_EM, ADMIN_ID, AGORA).revogar(AGORA), 'CONVITE_INVALIDO'],
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

  it('aceita motivo no limite de caracteres, contado após o trim, e registra o motivo aparado', () => {
    const usuario = ativo();
    const motivoAparado = 'a'.repeat(LIMITE_DE_CARACTERES_DO_MOTIVO);

    expect(ehOk(usuario.desativar(ADMIN_ID, `  ${motivoAparado}\n `, DEPOIS))).toBe(true);
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(usuario.retirarEventos()).toMatchObject([{ tipo: 'USUARIO_SUSPENSO', dados: { motivo: motivoAparado } }]);
  });

  it('recusa motivo acima do limite de caracteres com MOTIVO_LONGO_DEMAIS', () => {
    const usuario = ativo();
    const motivo = 'a'.repeat(LIMITE_DE_CARACTERES_DO_MOTIVO + 1);

    expect(codigoDe(usuario.desativar(ADMIN_ID, motivo, DEPOIS))).toBe('MOTIVO_LONGO_DEMAIS');
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('desativar usuário já SUSPENSO é idempotente: ok, sem evento', () => {
    const usuario = emSituacao('SUSPENSO');

    expect(ehOk(usuario.desativar(ADMIN_ID, 'de novo', DEPOIS))).toBe(true);
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it.each([
    'CONVITE_PENDENTE',
    'REVOGADO',
  ] as const)('recusa desativar usuário %s com SITUACAO_DO_USUARIO_NAO_PERMITE', (situacao) => {
    const usuario = emSituacao(situacao);

    const resultado = usuario.desativar(ADMIN_ID, 'motivo', DEPOIS);

    expect(codigoDe(resultado)).toBe('SITUACAO_DO_USUARIO_NAO_PERMITE');
    expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({ situacao });
    expect(usuario.situacao).toBe(situacao);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario.reativar', () => {
  it('volta de SUSPENSO para ATIVO com USUARIO_REATIVADO e autor', () => {
    const usuario = emSituacao('SUSPENSO');

    const resultado = usuario.reativar(ADMIN_ID, 'voltou das férias', DEPOIS);

    expect(ehOk(resultado)).toBe(true);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.retirarEventos()).toMatchObject([
      { tipo: 'USUARIO_REATIVADO', ocorridoEm: DEPOIS, dados: { autorId: ADMIN_ID, motivo: 'voltou das férias' } },
    ]);
  });

  it.each(['', '   \n'])('recusa reativar sem motivo (%j) com MOTIVO_OBRIGATORIO', (motivo) => {
    const usuario = emSituacao('SUSPENSO');

    expect(codigoDe(usuario.reativar(ADMIN_ID, motivo, DEPOIS))).toBe('MOTIVO_OBRIGATORIO');
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('grava o motivo aparado e aceita exatamente o limite', () => {
    const usuario = emSituacao('SUSPENSO');
    const motivoAparado = 'a'.repeat(LIMITE_DE_CARACTERES_DO_MOTIVO);

    expect(ehOk(usuario.reativar(ADMIN_ID, `  ${motivoAparado}\n `, DEPOIS))).toBe(true);

    expect(usuario.retirarEventos()).toMatchObject([{ tipo: 'USUARIO_REATIVADO', dados: { motivo: motivoAparado } }]);
  });

  it('recusa motivo acima do limite com MOTIVO_LONGO_DEMAIS', () => {
    const usuario = emSituacao('SUSPENSO');

    const resultado = usuario.reativar(ADMIN_ID, 'a'.repeat(LIMITE_DE_CARACTERES_DO_MOTIVO + 1), DEPOIS);

    expect(codigoDe(resultado)).toBe('MOTIVO_LONGO_DEMAIS');
    expect(usuario.situacao).toBe('SUSPENSO');
  });

  it('reativar usuário já ATIVO é idempotente: ok, sem evento', () => {
    const usuario = ativo();
    usuario.retirarEventos();

    expect(ehOk(usuario.reativar(ADMIN_ID, 'motivo', DEPOIS))).toBe(true);
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it.each([
    'CONVITE_PENDENTE',
    'REVOGADO',
  ] as const)('recusa reativar usuário %s com SITUACAO_DO_USUARIO_NAO_PERMITE', (situacao) => {
    const usuario = emSituacao(situacao);

    const resultado = usuario.reativar(ADMIN_ID, 'motivo', DEPOIS);

    expect(codigoDe(resultado)).toBe('SITUACAO_DO_USUARIO_NAO_PERMITE');
    expect(ehErr(resultado) && resultado.erro.detalhes).toEqual({ situacao });
    expect(usuario.situacao).toBe(situacao);
    expect(usuario.retirarEventos()).toEqual([]);
  });

  it('desativar e reativar preservam subjectId e grupos', () => {
    const usuario = ativo();

    usuario.desativar(ADMIN_ID, 'pausa', AGORA);
    usuario.reativar(ADMIN_ID, 'motivo', DEPOIS);

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

    expect(codigoDe(usuario.definirGrupos([GRUPO_B], ADMIN_ID, DEPOIS))).toBe('SITUACAO_DO_USUARIO_NAO_PERMITE');
    expect(usuario.grupos).toEqual([GRUPO_A]);
    expect(usuario.retirarEventos()).toEqual([]);
  });
});

describe('Usuario × pessoa', () => {
  it.todo('US1: todo usuário referencia uma pessoa existente e ativa (etapa B1)');
});

describe('Usuario · convite com autor e validade de 72 horas', () => {
  const LIMITE_DE_72_HORAS = new Date('2026-03-04T10:00:00Z');

  function convidarComExpiracao(conviteExpiraEm: Date): Usuario {
    return Usuario.convidar({
      id: USUARIO_ID,
      nome: NOME,
      email: 'maria@casa.org',
      grupos: [GRUPO_A],
      hashDoConvite: HASH,
      conviteExpiraEm,
      convidadoPor: ADMIN_ID,
      em: AGORA,
    });
  }

  it('convidar grava quem criou o convite e quando', () => {
    const { convite } = convidado();

    expect(convite?.criadoPor).toBe(ADMIN_ID);
    expect(convite?.criadoEm).toEqual(AGORA);
  });

  it('reenviar grava como autor quem reenviou, não quem convidou', () => {
    const usuario = convidado();
    const outroAdmin = 'admin-2' as UsuarioId;

    usuario.reenviarConvite(NOVO_HASH, NOVA_EXPIRA_EM, outroAdmin, DEPOIS);

    expect(usuario.convite?.criadoPor).toBe(outroAdmin);
    expect(usuario.convite?.criadoEm).toEqual(DEPOIS);
    expect(usuario.convitesSubstituidos[0]?.criadoPor).toBe(ADMIN_ID);
  });

  it('convidar aceita expiração no limite de 72 horas', () => {
    expect(convidarComExpiracao(LIMITE_DE_72_HORAS).convite?.expiraEm).toEqual(LIMITE_DE_72_HORAS);
  });

  it.each([
    ['além de 72 horas', new Date(LIMITE_DE_72_HORAS.getTime() + 1)],
    ['no passado', new Date('2026-02-28T10:00:00Z')],
    ['no instante do convite', AGORA],
  ])('convidar recusa expiração %s', (_descricao, expiracao) => {
    expect(() => convidarComExpiracao(expiracao)).toThrow(RangeError);
  });

  it('reenviar recusa expiração além de 72 horas do reenvio e preserva o convite atual', () => {
    const usuario = convidado();
    const alemDoLimite = new Date(DEPOIS.getTime() + 72 * 3_600_000 + 1);

    expect(() => usuario.reenviarConvite(NOVO_HASH, alemDoLimite, ADMIN_ID, DEPOIS)).toThrow(RangeError);
    expect(usuario.convite?.hashDoToken).toBe(HASH);
    expect(usuario.convitesSubstituidos).toEqual([]);
  });

  it('reenviar recusa expiração no passado', () => {
    expect(() => convidado().reenviarConvite(NOVO_HASH, AGORA, ADMIN_ID, DEPOIS)).toThrow(RangeError);
  });
});

describe('Usuario · ativadoEm e suspensoEm', () => {
  it('nasce sem ativação nem suspensão', () => {
    const usuario = convidado();

    expect(usuario.ativadoEm).toBeNull();
    expect(usuario.suspensoEm).toBeNull();
  });

  it('ativar grava o instante da ativação', () => {
    const usuario = convidado();
    usuario.ativar(HASH, SUBJECT, DEPOIS);

    expect(usuario.ativadoEm).toEqual(DEPOIS);
    expect(usuario.suspensoEm).toBeNull();
  });

  it('desativar grava o instante da suspensão e preserva o da ativação', () => {
    const usuario = convidado();
    usuario.ativar(HASH, SUBJECT, DEPOIS);
    usuario.desativar(ADMIN_ID, 'saiu da casa', EXPIRA_EM);

    expect(usuario.suspensoEm).toEqual(EXPIRA_EM);
    expect(usuario.ativadoEm).toEqual(DEPOIS);
  });

  it('desativar de novo não move o instante da suspensão', () => {
    const usuario = ativo();
    usuario.desativar(ADMIN_ID, 'motivo', DEPOIS);
    usuario.desativar(ADMIN_ID, 'motivo', EXPIRA_EM);

    expect(usuario.suspensoEm).toEqual(DEPOIS);
  });

  it('reativar limpa a suspensão', () => {
    const usuario = ativo();
    usuario.desativar(ADMIN_ID, 'motivo', DEPOIS);
    usuario.reativar(ADMIN_ID, 'motivo', EXPIRA_EM);

    expect(usuario.suspensoEm).toBeNull();
  });

  it('reconstituir restaura os dois instantes', () => {
    const usuario = Usuario.reconstituir({
      id: USUARIO_ID,
      pessoaId: null,
      subjectId: SUBJECT,
      nome: NOME,
      email: 'maria@casa.org',
      situacao: 'SUSPENSO',
      grupos: [],
      ativadoEm: AGORA,
      suspensoEm: DEPOIS,
      ultimoAcessoEm: null,
      convite: null,
    });

    expect(usuario.ativadoEm).toEqual(AGORA);
    expect(usuario.suspensoEm).toEqual(DEPOIS);
  });
});

describe('Usuario · atribuições de grupo pendentes', () => {
  it('convidar registra cada grupo atribuído por quem convidou', () => {
    const usuario = convidado([GRUPO_A, GRUPO_B]);

    expect(usuario.atribuicoesPendentes).toEqual([
      { grupoId: GRUPO_A, por: ADMIN_ID, em: AGORA },
      { grupoId: GRUPO_B, por: ADMIN_ID, em: AGORA },
    ]);
  });

  it('definirGrupos registra só os grupos acrescentados, com o autor da mudança', () => {
    const usuario = ativo();
    const outroAdmin = 'admin-2' as UsuarioId;

    usuario.definirGrupos([GRUPO_A, GRUPO_B], outroAdmin, DEPOIS);

    expect(usuario.atribuicoesPendentes).toEqual([{ grupoId: GRUPO_B, por: outroAdmin, em: DEPOIS }]);
  });

  it('grupo acrescentado e depois removido não fica pendente', () => {
    const usuario = ativo();
    usuario.definirGrupos([GRUPO_A, GRUPO_B], ADMIN_ID, DEPOIS);
    usuario.definirGrupos([GRUPO_A], ADMIN_ID, DEPOIS);

    expect(usuario.atribuicoesPendentes).toEqual([]);
  });

  it('grupo reacrescentado fica com a atribuição mais recente', () => {
    const usuario = ativo();
    usuario.definirGrupos([GRUPO_A, GRUPO_B], ADMIN_ID, DEPOIS);
    usuario.definirGrupos([GRUPO_A], ADMIN_ID, DEPOIS);
    usuario.definirGrupos([GRUPO_A, GRUPO_B], 'admin-2' as UsuarioId, EXPIRA_EM);

    expect(usuario.atribuicoesPendentes).toEqual([{ grupoId: GRUPO_B, por: 'admin-2', em: EXPIRA_EM }]);
  });

  it('usuário reconstituído não tem atribuição pendente', () => {
    expect(ativo().atribuicoesPendentes).toEqual([]);
  });
});
