import { Logger } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntregaDeConvite } from '../../../src/modules/identidade/application/convite/entrega-de-convite.js';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { montarEntrega, TOKEN_EM_CLARO, UnidadeDeTrabalhoComGanchos } from './dubles-de-convite.js';

const CONVITE = {
  usuarioId: 'a1000000-0000-7000-8000-000000000002' as UsuarioId,
  email: 'maria@casa.org',
  nome: 'Maria Silva',
  token: TOKEN_EM_CLARO,
  expiraEm: new Date('2026-03-08T10:00:00.000Z'),
};

describe('EntregaDeConvite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('só chama o enviador depois da confirmação', async () => {
    const { unidade, enviador, entrega } = montarEntrega();

    await unidade.transacao('escrita', (contexto) => Promise.resolve(entrega.depoisDoCommit(contexto, CONVITE)));
    expect(enviador.enviados).toEqual([]);
    unidade.confirmar();

    expect(enviador.enviados).toEqual([CONVITE]);
  });

  it('não chama o enviador quando a transação nunca confirma', async () => {
    const { unidade, enviador, entrega } = montarEntrega();

    await unidade.transacao('escrita', (contexto) => Promise.resolve(entrega.depoisDoCommit(contexto, CONVITE)));

    expect(enviador.enviados).toEqual([]);
  });

  it('falha no envio vai ao log sem token nem e-mail e não propaga', async () => {
    const { unidade, enviador, entrega } = montarEntrega();
    enviador.falharCom = new TypeError(`SMTP recusou ${CONVITE.email} com ${CONVITE.token}`);
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await unidade.transacao('escrita', (contexto) => Promise.resolve(entrega.depoisDoCommit(contexto, CONVITE)));
    unidade.confirmar();
    await vi.waitFor(() => expect(log).toHaveBeenCalledTimes(1));

    const mensagem = String(log.mock.calls[0]![0]);
    expect(mensagem).toContain(CONVITE.usuarioId);
    expect(mensagem).toContain('TypeError');
    expect(mensagem).not.toContain(CONVITE.email);
    expect(mensagem).not.toContain(CONVITE.token);
  });

  describe('entregas em voo', () => {
    function enviadorQueSoTerminaQuandoLiberado(): { liberar: () => void; terminou: () => boolean; enviador: EnviadorDeConvite } {
      let liberar: () => void = () => undefined;
      let terminou = false;
      const enviador = new (class extends EnviadorDeConvite {
        enviar(): Promise<void> {
          return new Promise<void>((resolver) => {
            liberar = resolver;
          }).then(() => {
            terminou = true;
          });
        }
      })();
      return { liberar: () => liberar(), terminou: () => terminou, enviador };
    }

    const ESPERA_PARA_CONFIRMAR_QUE_NAO_RESOLVEU_EM_MS = 20;

    async function enviarSemTerminar() {
      const parcial = enviadorQueSoTerminaQuandoLiberado();
      const unidade = new UnidadeDeTrabalhoComGanchos();
      const entrega = new EntregaDeConvite(parcial.enviador);
      await unidade.transacao('escrita', (contexto) => Promise.resolve(entrega.depoisDoCommit(contexto, CONVITE)));
      unidade.confirmar();
      return { ...parcial, entrega };
    }

    async function resolveuAntesDeLiberar(esperar: () => Promise<void>, liberar: () => void): Promise<boolean> {
      let resolveu = false;
      const espera = esperar().then(() => {
        resolveu = true;
      });
      await new Promise((resolver) => setTimeout(resolver, ESPERA_PARA_CONFIRMAR_QUE_NAO_RESOLVEU_EM_MS));
      const resolveuCedo = resolveu;
      liberar();
      await espera;
      return resolveuCedo;
    }

    it('aguardarEntregas só resolve depois de o envio em voo terminar', async () => {
      const { liberar, terminou, entrega } = await enviarSemTerminar();

      const resolveuCedo = await resolveuAntesDeLiberar(() => entrega.aguardarEntregas(), liberar);

      expect(resolveuCedo).toBe(false);
      expect(terminou()).toBe(true);
    });

    it('esquece a entrega concluída, sem acumular promessas', async () => {
      const { liberar, entrega } = await enviarSemTerminar();
      expect(Reflect.get(entrega, 'entregasEmVoo')).toHaveProperty('size', 1);

      liberar();
      await entrega.aguardarEntregas();
      await Promise.resolve();

      expect(Reflect.get(entrega, 'entregasEmVoo')).toHaveProperty('size', 0);
    });

    it('aguardarEntregas resolve também quando o envio falha', async () => {
      const { unidade, enviador, entrega } = montarEntrega();
      enviador.falharCom = new Error('indisponível');
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await unidade.transacao('escrita', (contexto) => Promise.resolve(entrega.depoisDoCommit(contexto, CONVITE)));
      unidade.confirmar();

      await expect(entrega.aguardarEntregas()).resolves.toBeUndefined();
    });

    it('resolve de imediato quando não há entrega em voo', async () => {
      const { entrega } = montarEntrega();

      await expect(entrega.aguardarEntregas()).resolves.toBeUndefined();
    });

    it('o encerramento do módulo aguarda as entregas em voo', async () => {
      const { liberar, terminou, entrega } = await enviarSemTerminar();

      const resolveuCedo = await resolveuAntesDeLiberar(() => entrega.onModuleDestroy(), liberar);

      expect(resolveuCedo).toBe(false);
      expect(terminou()).toBe(true);
    });
  });
});
