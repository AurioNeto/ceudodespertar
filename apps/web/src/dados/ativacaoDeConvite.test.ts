import { describe, expect, it, vi } from 'vitest';
import type { CodigoDeErro } from '@cdd/contracts';
import { CAMINHO_DA_ATIVACAO, CHAVE_DO_CONVITE_GUARDADO, criarAtivacaoDeConvite } from './ativacaoDeConvite';
import type { ClienteHttp, OpcoesDeRequisicao } from './clienteHttp';
import { ErroDaApi, ErroDeRede } from './erros';

const CONVITE = 'a'.repeat(43);

function criarArmazenamento(inicial: Record<string, string> = {}) {
  const valores = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => valores.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void valores.set(chave, valor),
    removeItem: (chave: string) => void valores.delete(chave),
    valores,
  };
}

function montar(resposta: () => Promise<unknown>, inicial: Record<string, string> = {}) {
  const armazenamento = criarArmazenamento(inicial);
  const requisitar = vi.fn((_opcoes: OpcoesDeRequisicao) => resposta());
  const clienteHttp = { requisitar } as unknown as ClienteHttp;
  const ativacao = criarAtivacaoDeConvite({ clienteHttp, armazenamento: () => armazenamento });
  return { ativacao, requisitar, armazenamento };
}

const COM_CONVITE = { [CHAVE_DO_CONVITE_GUARDADO]: CONVITE };

async function capturar(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('a promessa deveria ter rejeitado');
}

describe('ativação do convite guardado', () => {
  it('sem convite guardado não chama a API', async () => {
    const { ativacao, requisitar } = montar(() => Promise.resolve({ situacao: 'ATIVO' }));

    await ativacao.ativarSeHouver();

    expect(requisitar).not.toHaveBeenCalled();
  });

  it('guarda o convite e o envia uma vez por POST, esquecendo-o depois do sucesso', async () => {
    const { ativacao, requisitar, armazenamento } = montar(() => Promise.resolve({ situacao: 'ATIVO' }));

    ativacao.guardar(CONVITE);
    await ativacao.ativarSeHouver();
    await ativacao.ativarSeHouver();

    expect(requisitar).toHaveBeenCalledTimes(1);
    expect(requisitar).toHaveBeenCalledWith({
      metodo: 'POST',
      caminho: CAMINHO_DA_ATIVACAO,
      corpo: { convite: CONVITE },
    });
    expect(armazenamento.valores.size).toBe(0);
  });

  it.each(['abc', `${CONVITE}a`, `${'a'.repeat(42)}=`])('não guarda convite fora do formato: %s', (convite) => {
    const { ativacao, armazenamento } = montar(() => Promise.resolve({ situacao: 'ATIVO' }));

    ativacao.guardar(convite);

    expect(armazenamento.valores.size).toBe(0);
  });

  it('tentativas simultâneas compartilham um único POST', async () => {
    let concluir: (valor: unknown) => void = () => undefined;
    const { ativacao, requisitar } = montar(
      () =>
        new Promise((resolver) => {
          concluir = resolver;
        }),
      COM_CONVITE,
    );

    const primeira = ativacao.ativarSeHouver();
    const segunda = ativacao.ativarSeHouver();
    concluir({ situacao: 'ATIVO' });
    await Promise.all([primeira, segunda]);

    expect(requisitar).toHaveBeenCalledTimes(1);
  });

  it.each<[CodigoDeErro, number]>([
    ['CONVITE_INVALIDO', 400],
    ['CORPO_INVALIDO', 400],
    ['CONVITE_EXPIRADO', 410],
    ['CONVITE_JA_USADO', 409],
    ['SUJEITO_JA_VINCULADO', 409],
    ['CONFLITO_DE_CONCORRENCIA', 409],
    ['CONVITE_DE_OUTRO_SUJEITO', 403],
    ['USUARIO_SUSPENSO', 401],
    ['USUARIO_REVOGADO', 401],
    ['ERRO_INTERNO', 500],
  ])('esquece o convite e repassa o erro em %s', async (codigo, status) => {
    const recusa = new ErroDaApi({ status, codigo });
    const { ativacao, armazenamento } = montar(() => Promise.reject(recusa), COM_CONVITE);

    expect(await capturar(ativacao.ativarSeHouver())).toBe(recusa);
    expect(armazenamento.valores.size).toBe(0);
  });

  it.each([
    ['indisponibilidade do provedor', new ErroDaApi({ status: 503, codigo: 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL' })],
    ['sessão vencida', new ErroDaApi({ status: 401, codigo: 'NAO_AUTENTICADO' })],
    ['falha de rede', new ErroDeRede(new Error('offline'))],
  ])('mantém o convite para uma nova tentativa em %s', async (_caso, erro) => {
    const { ativacao, armazenamento } = montar(() => Promise.reject(erro), COM_CONVITE);

    expect(await capturar(ativacao.ativarSeHouver())).toBe(erro);
    expect(armazenamento.valores.get(CHAVE_DO_CONVITE_GUARDADO)).toBe(CONVITE);
  });

  it('armazenamento bloqueado não quebra a entrada', async () => {
    const requisitar = vi.fn();
    const bloqueado = () => {
      throw new DOMException('bloqueado', 'SecurityError');
    };
    const ativacao = criarAtivacaoDeConvite({
      clienteHttp: { requisitar } as unknown as ClienteHttp,
      armazenamento: bloqueado,
    });

    expect(() => ativacao.guardar(CONVITE)).not.toThrow();
    await ativacao.ativarSeHouver();
    expect(requisitar).not.toHaveBeenCalled();
  });
});
