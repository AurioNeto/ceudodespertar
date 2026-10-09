import { Logger } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarEntrega, TOKEN_EM_CLARO } from './dubles-de-convite.js';

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
});
