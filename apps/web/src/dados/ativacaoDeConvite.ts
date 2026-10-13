import { AtivarConvite } from '@cdd/contracts';
import type { UsuarioAtivado } from '@cdd/contracts';
import type { ClienteHttp } from './clienteHttp';
import { ehFalhaTemporaria } from './clienteDeConsultas';
import { ErroDaApi } from './erros';

export const PARAMETRO_DO_CONVITE = 'convite';
export const CHAVE_DO_CONVITE_GUARDADO = 'cdd.convite';
export const CAMINHO_DA_ATIVACAO = '/eu/ativacao';

export type ArmazenamentoDoConvite = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface AtivacaoDeConvite {
  guardar(convite: string): void;
  ativarSeHouver(): Promise<void>;
}

export interface DependenciasDaAtivacaoDeConvite {
  readonly clienteHttp: ClienteHttp;
  readonly armazenamento?: () => ArmazenamentoDoConvite;
}

function permiteNovaTentativa(erro: unknown): boolean {
  return ehFalhaTemporaria(erro) || (erro instanceof ErroDaApi && erro.ehFalhaDeAutenticacao);
}

function temFormatoDeConvite(convite: string): boolean {
  return AtivarConvite.safeParse({ convite }).success;
}

export function criarAtivacaoDeConvite({
  clienteHttp,
  armazenamento = () => window.sessionStorage,
}: DependenciasDaAtivacaoDeConvite): AtivacaoDeConvite {
  let ativacaoEmAndamento: Promise<void> | null = null;

  function lerGuardado(): string | null {
    try {
      return armazenamento().getItem(CHAVE_DO_CONVITE_GUARDADO);
    } catch {
      return null;
    }
  }

  function esquecer(): void {
    try {
      armazenamento().removeItem(CHAVE_DO_CONVITE_GUARDADO);
    } catch {
      return;
    }
  }

  function guardar(convite: string): void {
    if (!temFormatoDeConvite(convite)) return;
    try {
      armazenamento().setItem(CHAVE_DO_CONVITE_GUARDADO, convite);
    } catch {
      return;
    }
  }

  async function ativar(convite: string): Promise<void> {
    try {
      await clienteHttp.requisitar<UsuarioAtivado>({ metodo: 'POST', caminho: CAMINHO_DA_ATIVACAO, corpo: { convite } });
    } catch (erro) {
      if (!permiteNovaTentativa(erro)) esquecer();
      throw erro;
    }
    esquecer();
  }

  function ativarSeHouver(): Promise<void> {
    if (ativacaoEmAndamento) return ativacaoEmAndamento;
    const convite = lerGuardado();
    if (!convite) return Promise.resolve();
    const ativacao = ativar(convite).finally(() => {
      ativacaoEmAndamento = null;
    });
    ativacaoEmAndamento = ativacao;
    return ativacao;
  }

  return { guardar, ativarSeHouver };
}
