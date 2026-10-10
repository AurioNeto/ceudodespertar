import { randomUUID } from 'node:crypto';
import type { InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { LeitorDoSujeitoDoUsuario } from '../../../src/modules/identidade/application/usuarios/leitor-do-sujeito-do-usuario.js';
import type { SujeitoDoUsuario } from '../../../src/modules/identidade/application/usuarios/leitor-do-sujeito-do-usuario.js';
import {
  EventoDeSituacaoSemInstituicao,
  SincronizadorDoAcessoNoProvedor,
} from '../../../src/modules/identidade/infrastructure/acesso/sincronizador-do-acesso-no-provedor.js';
import { ContextoDaRequisicao } from '../../../src/shared/infrastructure/contexto-da-requisicao.js';
import { lerMetadadosReageA } from '../../../src/shared/infrastructure/eventos/reage-a.decorator.js';
import type { EventoDeDominio } from '../../../src/shared/kernel/evento-de-dominio.js';
import { ControleDeAcessoQueRegistra } from './controle-de-acesso-que-registra.js';

const USUARIO = 'a1000000-0000-7000-8000-000000000002' as UsuarioId;
const INSTITUICAO = 'a0000000-0000-7000-8000-000000000000' as InstituicaoId;
const SUJEITO = 'sub-do-keycloak';

class LeitorFalso extends LeitorDoSujeitoDoUsuario {
  readonly leituras: Array<{ usuarioId: UsuarioId; instituicaoId: InstituicaoId }> = [];

  constructor(private readonly sujeito: SujeitoDoUsuario | undefined) {
    super();
  }

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<SujeitoDoUsuario | undefined> {
    this.leituras.push({ usuarioId, instituicaoId });
    return Promise.resolve(this.sujeito);
  }
}

function evento(tipo: 'USUARIO_SUSPENSO' | 'USUARIO_REATIVADO'): EventoDeDominio {
  return {
    eventoId: randomUUID(),
    tipo,
    ocorridoEm: new Date(),
    agregadoTipo: 'Usuario',
    agregadoId: USUARIO,
    dados: {},
  };
}

function montar(subjectId: string | null, situacao: SituacaoUsuario) {
  const leitor = new LeitorFalso({ subjectId, situacao });
  const controle = new ControleDeAcessoQueRegistra();
  const sincronizador = new SincronizadorDoAcessoNoProvedor(leitor, controle);
  const reagir = (tipo: 'USUARIO_SUSPENSO' | 'USUARIO_REATIVADO') =>
    ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId: INSTITUICAO }, () =>
      tipo === 'USUARIO_SUSPENSO'
        ? sincronizador.aoSuspenderUsuario(evento(tipo))
        : sincronizador.aoReativarUsuario(evento(tipo)),
    );
  return { leitor, controle, sincronizador, reagir };
}

describe('SincronizadorDoAcessoNoProvedor', () => {
  it('registra um consumidor distinto para suspensão e para reativação', () => {
    const prototipo = SincronizadorDoAcessoNoProvedor.prototype;

    expect(lerMetadadosReageA(prototipo, 'aoSuspenderUsuario')).toEqual({
      tipo: 'USUARIO_SUSPENSO',
      consumidor: 'SincronizadorDoAcessoNoProvedor.aoSuspenderUsuario',
    });
    expect(lerMetadadosReageA(prototipo, 'aoReativarUsuario')).toEqual({
      tipo: 'USUARIO_REATIVADO',
      consumidor: 'SincronizadorDoAcessoNoProvedor.aoReativarUsuario',
    });
  });

  it('usuário suspenso no banco é bloqueado no provedor, lido na instituição do evento', async () => {
    const { leitor, controle, reagir } = montar(SUJEITO, 'SUSPENSO');

    await reagir('USUARIO_SUSPENSO');

    expect(controle.chamadas).toEqual([{ operacao: 'bloquear', sujeito: SUJEITO }]);
    expect(leitor.leituras).toEqual([{ usuarioId: USUARIO, instituicaoId: INSTITUICAO }]);
  });

  it('usuário ativo no banco é liberado no provedor', async () => {
    const { controle, reagir } = montar(SUJEITO, 'ATIVO');

    await reagir('USUARIO_REATIVADO');

    expect(controle.chamadas).toEqual([{ operacao: 'liberar', sujeito: SUJEITO }]);
  });

  it('converge pelo estado atual: SUSPENSO com usuário já ATIVO libera', async () => {
    const { controle, reagir } = montar(SUJEITO, 'ATIVO');

    await reagir('USUARIO_SUSPENSO');

    expect(controle.chamadas).toEqual([{ operacao: 'liberar', sujeito: SUJEITO }]);
  });

  it('converge pelo estado atual: REATIVADO com usuário SUSPENSO bloqueia', async () => {
    const { controle, reagir } = montar(SUJEITO, 'SUSPENSO');

    await reagir('USUARIO_REATIVADO');

    expect(controle.chamadas).toEqual([{ operacao: 'bloquear', sujeito: SUJEITO }]);
  });

  it('usuário revogado no banco é bloqueado', async () => {
    const { controle, reagir } = montar(SUJEITO, 'REVOGADO');

    await reagir('USUARIO_REATIVADO');

    expect(controle.chamadas).toEqual([{ operacao: 'bloquear', sujeito: SUJEITO }]);
  });

  it.each(['SUSPENSO', 'ATIVO'] as const)('usuário %s sem subject_id (convite pendente) não tem nada a fazer', async (situacao) => {
    const { controle, reagir } = montar(null, situacao);

    await reagir('USUARIO_SUSPENSO');

    expect(controle.chamadas).toEqual([]);
  });

  it('usuário que não existe mais no banco não tem nada a fazer', async () => {
    const controle = new ControleDeAcessoQueRegistra();
    const sincronizador = new SincronizadorDoAcessoNoProvedor(new LeitorFalso(undefined), controle);

    await ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId: INSTITUICAO }, () =>
      sincronizador.aoSuspenderUsuario(evento('USUARIO_SUSPENSO')),
    );

    expect(controle.chamadas).toEqual([]);
  });

  it('falha do provedor propaga para o despachante repetir', async () => {
    const { controle, reagir } = montar(SUJEITO, 'SUSPENSO');
    controle.falharCom = new Error('provedor fora');

    await expect(reagir('USUARIO_SUSPENSO')).rejects.toThrow('provedor fora');
  });

  it('sem instituição no contexto recusa em vez de ler às cegas', async () => {
    const { controle, sincronizador } = montar(SUJEITO, 'SUSPENSO');

    await expect(sincronizador.aoSuspenderUsuario(evento('USUARIO_SUSPENSO'))).rejects.toBeInstanceOf(
      EventoDeSituacaoSemInstituicao,
    );
    expect(controle.chamadas).toEqual([]);
  });
});
