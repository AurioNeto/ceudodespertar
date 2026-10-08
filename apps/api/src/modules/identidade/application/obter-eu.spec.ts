import type { Eu, GrupoId, InstituicaoId, Permissao, UsuarioId } from '@cdd/contracts';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Relogio } from '../../../shared/infrastructure/relogio.js';
import { LeitorDoEu } from './leitor-do-eu.js';
import { INTERVALO_MINIMO_ENTRE_REGISTROS_DE_ACESSO_EM_MS, ObterEu } from './obter-eu.js';
import { RegistradorDeUltimoAcesso } from './registrador-de-ultimo-acesso.js';
import type { PedidoDeRegistroDeAcesso } from './registrador-de-ultimo-acesso.js';

const USUARIO = 'usuario-1' as UsuarioId;
const INSTITUICAO = 'instituicao-1' as InstituicaoId;
const AGORA = new Date('2026-10-08T12:00:00.000Z');

const EU: Eu = {
  usuario: { id: USUARIO, nome: 'Maria', email: 'maria@casa.org' },
  instituicao: { id: INSTITUICAO, nome: 'Casa' },
  grupos: [{ id: 'grupo-1' as GrupoId, nome: 'Tesouraria' }],
  permissoes: ['financeiro.lancamento.ler' as Permissao],
};

class LeitorFixo extends LeitorDoEu {
  readonly pedidos: Array<[UsuarioId, InstituicaoId]> = [];

  ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<Eu> {
    this.pedidos.push([usuarioId, instituicaoId]);
    return Promise.resolve(EU);
  }
}

class RegistradorGravador extends RegistradorDeUltimoAcesso {
  readonly pedidos: PedidoDeRegistroDeAcesso[] = [];
  falha: unknown;

  registrar(pedido: PedidoDeRegistroDeAcesso): Promise<void> {
    this.pedidos.push(pedido);
    return this.falha === undefined ? Promise.resolve() : Promise.reject(this.falha as Error);
  }
}

class RelogioFixo extends Relogio {
  agora(): Date {
    return AGORA;
  }
}

function montar() {
  const leitor = new LeitorFixo();
  const registrador = new RegistradorGravador();
  return { leitor, registrador, obterEu: new ObterEu(leitor, registrador, new RelogioFixo()) };
}

describe('ObterEu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('devolve o Eu lido da instituição do acesso', async () => {
    const { leitor, obterEu } = montar();

    const eu = await obterEu.executar({ usuarioId: USUARIO, instituicaoId: INSTITUICAO });

    expect(eu).toBe(EU);
    expect(leitor.pedidos).toEqual([[USUARIO, INSTITUICAO]]);
  });

  it('pede o registro do acesso agora, só se o último for anterior a uma hora', async () => {
    const { registrador, obterEu } = montar();

    await obterEu.executar({ usuarioId: USUARIO, instituicaoId: INSTITUICAO });

    expect(registrador.pedidos).toEqual([
      {
        usuarioId: USUARIO,
        instituicaoId: INSTITUICAO,
        em: AGORA,
        seUltimoAcessoAnteriorA: new Date(AGORA.getTime() - INTERVALO_MINIMO_ENTRE_REGISTROS_DE_ACESSO_EM_MS),
      },
    ]);
    expect(INTERVALO_MINIMO_ENTRE_REGISTROS_DE_ACESSO_EM_MS).toBe(3_600_000);
  });

  it('a falha ao registrar o acesso não derruba a resposta e vira log warn sem dado pessoal', async () => {
    const aviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { registrador, obterEu } = montar();
    registrador.falha = Object.assign(new Error('detalhe com maria@casa.org'), { name: 'ErroDeConexao' });

    const eu = await obterEu.executar({ usuarioId: USUARIO, instituicaoId: INSTITUICAO });

    expect(eu).toBe(EU);
    expect(aviso).toHaveBeenCalledTimes(1);
    const mensagem = String(aviso.mock.calls[0]?.[0]);
    expect(mensagem).toBe('falha ao registrar o último acesso: ErroDeConexao');
    expect(mensagem).not.toContain('maria@casa.org');
  });

  it('a falha que não é um Error também não derruba a resposta', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { registrador, obterEu } = montar();
    registrador.falha = 'texto solto';

    await expect(obterEu.executar({ usuarioId: USUARIO, instituicaoId: INSTITUICAO })).resolves.toBe(EU);
  });
});
