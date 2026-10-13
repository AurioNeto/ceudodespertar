import { describe, expect, it, vi } from 'vitest';
import { criarAvisoDeAcessoRecusado } from '@/dados';
import type { AtivacaoDeConvite, ClienteHttp, CredencialOidc, ServicoDeEntrada } from '@/dados';
import { erroDaApi } from '@/testes/fabricas';
import { criarFontesReais } from './fontesDaSessao';

function montar(ativarSeHouver: () => Promise<void>) {
  const chamadas: string[] = [];
  const requisitar = vi.fn(() => {
    chamadas.push('GET /eu');
    return Promise.resolve({});
  });
  const ativacaoDeConvite: AtivacaoDeConvite = {
    guardar: vi.fn(),
    ativarSeHouver: vi.fn(async () => {
      chamadas.push('ativação');
      await ativarSeHouver();
    }),
  };
  const avisoDeAcessoRecusado = criarAvisoDeAcessoRecusado();
  const fontes = criarFontesReais({
    clienteHttp: { requisitar } as unknown as ClienteHttp,
    credencial: { aoEncerrar: vi.fn() } as unknown as CredencialOidc,
    servicoDeEntrada: {} as ServicoDeEntrada,
    ativacaoDeConvite,
    avisoDeAcessoRecusado,
  });
  return { fontes, chamadas, ativacaoDeConvite, avisoDeAcessoRecusado };
}

describe('fontes reais da sessão', () => {
  it('ativa o convite guardado antes de buscar o acesso', async () => {
    const { fontes, chamadas } = montar(() => Promise.resolve());

    await fontes.buscarEu(new AbortController().signal);

    expect(chamadas).toEqual(['ativação', 'GET /eu']);
  });

  it('não busca o acesso quando a ativação é recusada', async () => {
    const recusa = erroDaApi(410, 'CONVITE_EXPIRADO');
    const { fontes, chamadas } = montar(() => Promise.reject(recusa));

    await expect(fontes.buscarEu(new AbortController().signal)).rejects.toBe(recusa);
    expect(chamadas).toEqual(['ativação']);
  });

  it('guarda o convite pela ativação', () => {
    const { fontes, ativacaoDeConvite } = montar(() => Promise.resolve());

    fontes.guardarConvite('token-do-convite');

    expect(ativacaoDeConvite.guardar).toHaveBeenCalledWith('token-do-convite');
  });
});

describe('aviso de acesso recusado', () => {
  it('a sessão ouve o aviso que o cliente HTTP dispara', () => {
    const { fontes, avisoDeAcessoRecusado } = montar(() => Promise.resolve());
    const ouvinte = vi.fn();

    const deixarDeOuvir = fontes.aoAcessoRecusado(ouvinte);
    avisoDeAcessoRecusado.avisar();
    deixarDeOuvir();
    avisoDeAcessoRecusado.avisar();

    expect(ouvinte).toHaveBeenCalledTimes(1);
  });
});
