import { PERMISSOES } from '@cdd/contracts';
import type { Permissao } from '@cdd/contracts';

const CHAVE_DAS_MARCAS_DE_ACESSO = Symbol('marcas-de-acesso');

export type MarcaDeAcesso =
  | { readonly tipo: 'publico' }
  | { readonly tipo: 'apenas-identificado' }
  | { readonly tipo: 'apenas-usuario-ativo' }
  | { readonly tipo: 'permissao'; readonly permissao: Permissao }
  | { readonly tipo: 'alguma-permissao'; readonly permissoes: readonly Permissao[] };

type DecoratorDeMarca = (alvo: object, chave?: string | symbol, descritor?: PropertyDescriptor) => void;

function marcar(marca: MarcaDeAcesso): DecoratorDeMarca {
  return (alvo, _chave, descritor) => {
    const portador: object = descritor?.value ?? alvo;
    const existentes = lerMarcasProprias(portador);
    Reflect.defineMetadata(CHAVE_DAS_MARCAS_DE_ACESSO, [...existentes, marca], portador);
  };
}

export function lerMarcasProprias(portador: object): readonly MarcaDeAcesso[] {
  return Reflect.getOwnMetadata(CHAVE_DAS_MARCAS_DE_ACESSO, portador) ?? [];
}

function exigirPermissaoDoCatalogo(permissao: string): asserts permissao is Permissao {
  if (!(PERMISSOES as readonly string[]).includes(permissao)) {
    throw new Error(`Permissão fora do catálogo em marca de acesso: ${permissao}`);
  }
}

export function Publico(): DecoratorDeMarca {
  return marcar({ tipo: 'publico' });
}

export function ApenasIdentificado(): DecoratorDeMarca {
  return marcar({ tipo: 'apenas-identificado' });
}

export function ApenasUsuarioAtivo(): DecoratorDeMarca {
  return marcar({ tipo: 'apenas-usuario-ativo' });
}

export function RequerPermissao(permissao: Permissao): DecoratorDeMarca {
  exigirPermissaoDoCatalogo(permissao);
  return marcar({ tipo: 'permissao', permissao });
}

export function RequerAlgumaPermissao(...permissoes: Permissao[]): DecoratorDeMarca {
  if (permissoes.length === 0) {
    throw new Error('RequerAlgumaPermissao exige ao menos uma permissão');
  }
  permissoes.forEach(exigirPermissaoDoCatalogo);
  return marcar({ tipo: 'alguma-permissao', permissoes: [...permissoes] });
}
