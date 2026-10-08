import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { ehOk } from '../../../../shared/kernel/result.js';
import { TIPOS_DE_EVENTO_DA_IDENTIDADE } from '../../domain/eventos-da-identidade.js';
import { Grupo } from '../../domain/grupo/grupo.js';
import { Usuario } from '../../domain/usuario/usuario.js';
import { EVENTOS_DA_IDENTIDADE_NAO_AUDITADOS, ErroDeEventoSemMapeamento, mapearEventoParaAuditoria } from './mapeamento-de-eventos.js';
import { ROTULOS_DE_AUDITORIA } from './rotulos-de-auditoria.js';

const AUTOR = 'autor-1' as UsuarioId;
const USUARIO_ID = 'usuario-1' as UsuarioId;
const GRUPO_A = 'grupo-a' as GrupoId;
const GRUPO_B = 'grupo-b' as GrupoId;
const GRUPO_ID = 'grupo-1' as GrupoId;
const EMAIL = 'maria.silva@casa.org';
const NOME = 'Maria Silva';
const SUBJECT = 'sub-keycloak-1';
const HASH = 'a'.repeat(64);
const INSTANTE = new Date('2026-03-01T12:00:00Z');
const EXPIRA = new Date('2026-03-04T12:00:00Z');

function usuarioConvidado(): Usuario {
  return Usuario.convidar({
    id: USUARIO_ID,
    nome: NOME,
    email: EMAIL,
    grupos: [GRUPO_A],
    hashDoConvite: HASH,
    conviteExpiraEm: EXPIRA,
    convidadoPor: AUTOR,
    em: INSTANTE,
  });
}

function usuarioAtivo(): Usuario {
  const usuario = usuarioConvidado();
  usuario.retirarEventos();
  usuario.ativar(HASH, SUBJECT, INSTANTE);
  usuario.retirarEventos();
  return usuario;
}

function grupoDaCasa(): Grupo {
  const resultado = Grupo.criar({
    id: GRUPO_ID,
    codigoSistema: null,
    nome: 'Apoio',
    descricao: 'Equipe de apoio',
    permissoes: ['estoque.saldo.ler'],
    protegido: false,
  });
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

function unico(eventos: readonly EventoDeDominio[]): EventoDeDominio {
  expect(eventos).toHaveLength(1);
  return eventos[0] as EventoDeDominio;
}

function todosOsEventosEmitidosPeloDominio(): EventoDeDominio[] {
  const convidado = usuarioConvidado();
  convidado.ativar(HASH, SUBJECT, INSTANTE);
  const reenviado = usuarioConvidado();
  reenviado.reenviarConvite('b'.repeat(64), EXPIRA, AUTOR, INSTANTE);
  const ativo = usuarioAtivo();
  ativo.desativar(AUTOR, 'afastamento', INSTANTE);
  ativo.reativar(AUTOR, 'retorno', INSTANTE);
  ativo.definirGrupos([GRUPO_B], AUTOR, INSTANTE);
  const grupo = grupoDaCasa();
  grupo.concederPermissao('estoque.movimento.registrar', AUTOR, INSTANTE);
  grupo.revogarPermissao('estoque.movimento.registrar', AUTOR, INSTANTE);
  grupo.renomear('Apoio geral', 'Equipe geral', AUTOR, INSTANTE);
  grupo.excluir(0, AUTOR, INSTANTE);
  return [convidado, reenviado, ativo, grupo].flatMap((agregado) => agregado.retirarEventos());
}

describe('mapearEventoParaAuditoria', () => {
  it('USUARIO_CONVIDADO: autor é quem convidou, alvo é o usuário e o e-mail fica de fora', () => {
    const entrada = mapearEventoParaAuditoria(unico(usuarioConvidado().retirarEventos()));

    expect(entrada).toStrictEqual({
      em: INSTANTE,
      autorId: AUTOR,
      operacao: 'USUARIO_CONVIDADO',
      agregadoTipo: 'Usuario',
      agregadoId: USUARIO_ID,
      pessoaAlvoId: null,
      detalhes: [],
      sensivel: false,
    });
  });

  it('USUARIO_ATIVADO: autor é o próprio usuário e o subject do provedor fica de fora', () => {
    const usuario = usuarioConvidado();
    usuario.retirarEventos();
    usuario.ativar(HASH, SUBJECT, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(usuario.retirarEventos()));

    expect(entrada).toMatchObject({ operacao: 'USUARIO_ATIVADO', autorId: USUARIO_ID, agregadoId: USUARIO_ID, detalhes: [] });
  });

  it('USUARIO_SUSPENSO: registra o motivo informado', () => {
    const usuario = usuarioAtivo();
    usuario.desativar(AUTOR, 'afastamento', INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(usuario.retirarEventos()));

    expect(entrada).toMatchObject({
      operacao: 'USUARIO_SUSPENSO',
      autorId: AUTOR,
      detalhes: [{ rotulo: ROTULOS_DE_AUDITORIA.motivo, valor: 'afastamento' }],
      sensivel: true,
    });
  });

  it('USUARIO_REATIVADO: registra o motivo informado como sensível', () => {
    const usuario = usuarioAtivo();
    usuario.desativar(AUTOR, 'afastamento', INSTANTE);
    usuario.retirarEventos();
    usuario.reativar(AUTOR, 'retorno', INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(usuario.retirarEventos()));

    expect(entrada).toMatchObject({
      operacao: 'USUARIO_REATIVADO',
      autorId: AUTOR,
      detalhes: [{ rotulo: ROTULOS_DE_AUDITORIA.motivo, valor: 'retorno' }],
      sensivel: true,
    });
  });

  it('GRUPO_ALTERADO: grupos antes e depois por id', () => {
    const usuario = usuarioAtivo();
    usuario.definirGrupos([GRUPO_A, GRUPO_B], AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(usuario.retirarEventos()));

    expect(entrada).toMatchObject({
      operacao: 'GRUPO_ALTERADO',
      autorId: AUTOR,
      agregadoTipo: 'Usuario',
      detalhes: [{ rotulo: ROTULOS_DE_AUDITORIA.grupos, valor: `${GRUPO_A},${GRUPO_B}`, anterior: GRUPO_A }],
    });
  });

  it('GRUPO_ALTERADO: lista vazia vira texto vazio', () => {
    const usuario = usuarioAtivo();
    usuario.definirGrupos([], AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(usuario.retirarEventos()));

    expect(entrada?.detalhes).toStrictEqual([{ rotulo: ROTULOS_DE_AUDITORIA.grupos, valor: '', anterior: GRUPO_A }]);
  });

  it('GRUPO_EDITADO: permissão concedida', () => {
    const grupo = grupoDaCasa();
    grupo.concederPermissao('estoque.movimento.registrar', AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(grupo.retirarEventos()));

    expect(entrada).toStrictEqual({
      em: INSTANTE,
      autorId: AUTOR,
      operacao: 'GRUPO_EDITADO',
      agregadoTipo: 'Grupo',
      agregadoId: GRUPO_ID,
      pessoaAlvoId: null,
      detalhes: [
        { rotulo: ROTULOS_DE_AUDITORIA.acao, valor: 'CONCEDIDA' },
        { rotulo: ROTULOS_DE_AUDITORIA.permissao, valor: 'estoque.movimento.registrar' },
      ],
      sensivel: false,
    });
  });

  it('GRUPO_EDITADO: permissão revogada', () => {
    const grupo = grupoDaCasa();
    grupo.revogarPermissao('estoque.saldo.ler', AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(grupo.retirarEventos()));

    expect(entrada?.detalhes).toStrictEqual([
      { rotulo: ROTULOS_DE_AUDITORIA.acao, valor: 'REVOGADA' },
      { rotulo: ROTULOS_DE_AUDITORIA.permissao, valor: 'estoque.saldo.ler' },
    ]);
  });

  it('GRUPO_EDITADO: grupo excluído', () => {
    const grupo = grupoDaCasa();
    grupo.excluir(0, AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(grupo.retirarEventos()));

    expect(entrada?.detalhes).toStrictEqual([{ rotulo: ROTULOS_DE_AUDITORIA.acao, valor: 'EXCLUIDO' }]);
  });

  it('GRUPO_EDITADO: renomeação leva nome e descrição novos com os anteriores', () => {
    const grupo = grupoDaCasa();
    grupo.renomear('Apoio geral', 'Equipe geral', AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(grupo.retirarEventos()));

    expect(entrada?.detalhes).toStrictEqual([
      { rotulo: ROTULOS_DE_AUDITORIA.acao, valor: 'RENOMEADO' },
      { rotulo: ROTULOS_DE_AUDITORIA.nome, valor: 'Apoio geral', anterior: 'Apoio' },
      { rotulo: ROTULOS_DE_AUDITORIA.descricao, valor: 'Equipe geral', anterior: 'Equipe de apoio' },
    ]);
  });

  it('GRUPO_EDITADO em grupo de sistema registra o código do grupo', () => {
    const resultado = Grupo.criar({
      id: GRUPO_ID,
      codigoSistema: 'LEITURA',
      nome: 'Leitura',
      descricao: 'Consulta',
      permissoes: ['estoque.saldo.ler'],
      protegido: true,
    });
    if (!ehOk(resultado)) throw new Error('fixture inválida');
    resultado.valor.concederPermissao('estoque.movimento.registrar', AUTOR, INSTANTE);

    const entrada = mapearEventoParaAuditoria(unico(resultado.valor.retirarEventos()));

    expect(entrada?.detalhes).toContainEqual({ rotulo: ROTULOS_DE_AUDITORIA.grupoDeSistema, valor: 'LEITURA' });
  });

  it('evento sem autor humano é auditado como autoria do sistema', () => {
    const entrada = mapearEventoParaAuditoria({
      eventoId: 'e-1',
      tipo: 'USUARIO_REATIVADO',
      ocorridoEm: INSTANTE,
      agregadoTipo: 'Usuario',
      agregadoId: USUARIO_ID,
      dados: { motivo: 'retorno' },
    });

    expect(entrada?.autorId).toBeNull();
  });

  it('nenhuma entrada carrega nome, e-mail ou subject', () => {
    const serializadas = todosOsEventosEmitidosPeloDominio().map((evento) => JSON.stringify(mapearEventoParaAuditoria(evento)));

    for (const texto of serializadas) {
      expect(texto).not.toContain(EMAIL);
      expect(texto).not.toContain(NOME);
      expect(texto).not.toContain(SUBJECT);
    }
  });

  it('tipo de evento fora do mapeamento é erro de programação', () => {
    const evento: EventoDeDominio = {
      eventoId: 'e-1',
      tipo: 'EVENTO_NOVO',
      ocorridoEm: INSTANTE,
      agregadoTipo: 'Usuario',
      agregadoId: USUARIO_ID,
      dados: {},
    };

    expect(() => mapearEventoParaAuditoria(evento)).toThrow(ErroDeEventoSemMapeamento);
  });

  it('dado do evento fora do formato esperado é erro de programação', () => {
    const evento: EventoDeDominio = {
      eventoId: 'e-1',
      tipo: 'USUARIO_SUSPENSO',
      ocorridoEm: INSTANTE,
      agregadoTipo: 'Usuario',
      agregadoId: USUARIO_ID,
      dados: { autorId: AUTOR, motivo: 42 },
    };

    expect(() => mapearEventoParaAuditoria(evento)).toThrow(TypeError);
  });

  it('ação de grupo desconhecida é erro de programação', () => {
    const evento: EventoDeDominio = {
      eventoId: 'e-1',
      tipo: 'GRUPO_EDITADO',
      ocorridoEm: INSTANTE,
      agregadoTipo: 'Grupo',
      agregadoId: GRUPO_ID,
      dados: { autorId: AUTOR, acao: 'DUPLICADO', codigoSistema: null },
    };

    expect(() => mapearEventoParaAuditoria(evento)).toThrow(ErroDeEventoSemMapeamento);
  });
});

describe('cobertura do mapeamento sobre os eventos da identidade', () => {
  it('todo tipo emitido pelo domínio está na lista de tipos da identidade', () => {
    const tipos = new Set(todosOsEventosEmitidosPeloDominio().map((evento) => evento.tipo));

    expect([...tipos].toSorted()).toStrictEqual([...TIPOS_DE_EVENTO_DA_IDENTIDADE].toSorted());
  });

  it('todo tipo da identidade tem mapeamento ou está na lista de não auditados', () => {
    const emitidos = todosOsEventosEmitidosPeloDominio();

    for (const tipo of TIPOS_DE_EVENTO_DA_IDENTIDADE) {
      const evento = emitidos.find((candidato) => candidato.tipo === tipo) as EventoDeDominio;
      const naoAuditado = (EVENTOS_DA_IDENTIDADE_NAO_AUDITADOS as readonly string[]).includes(tipo);

      const entrada = mapearEventoParaAuditoria(evento);

      expect(entrada === null).toBe(naoAuditado);
    }
  });

  it('a operação registrada de cada evento auditado é do tipo do evento', () => {
    for (const evento of todosOsEventosEmitidosPeloDominio()) {
      expect(mapearEventoParaAuditoria(evento)?.operacao).toBe(evento.tipo);
    }
  });
});
