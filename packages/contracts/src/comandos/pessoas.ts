import { z } from 'zod';
import { textoSemCaractereNulo, uuidEmMinusculas } from '../entrada.js';
import type { PessoaId } from '../kernel.js';
import type { Pessoa, TipoPessoa } from '../pessoas.js';

const TAMANHO_MAXIMO_DO_NOME = 200;
const TAMANHO_MAXIMO_DA_BUSCA = 200;
const TAMANHO_MAXIMO_DO_CURSOR = 512;
export const LIMITE_PADRAO_DA_LISTAGEM_DE_PESSOAS = 50;
export const LIMITE_MAXIMO_DA_LISTAGEM_DE_PESSOAS = 100;

const DIGITOS_DO_DOCUMENTO: Readonly<Record<TipoPessoa, number>> = { FISICA: 11, JURIDICA: 14 };

export const DadosDaPessoa = z
  .object({
    tipo: z.enum(['FISICA', 'JURIDICA']),
    nome: textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME),
    documento: z
      .string()
      .regex(/^\d+$/)
      .nullable()
      .default(null),
  })
  .refine(({ tipo, documento }) => documento === null || documento.length === DIGITOS_DO_DOCUMENTO[tipo], {
    message: 'CPF tem 11 dígitos e CNPJ, 14',
    params: { regra: 'documento_do_tipo' },
    path: ['documento'],
  });

export type DadosDaPessoa = z.infer<typeof DadosDaPessoa>;

export const CadastrarPessoa = DadosDaPessoa;

export type CadastrarPessoa = DadosDaPessoa;

export const EditarPessoa = DadosDaPessoa;

export type EditarPessoa = DadosDaPessoa;

export const ParametrosDaPessoa = z.object({ id: uuidEmMinusculas<PessoaId>() });

export type ParametrosDaPessoa = z.infer<typeof ParametrosDaPessoa>;

export const FiltroDePessoas = z.object({
  busca: textoSemCaractereNulo().trim().min(1).max(TAMANHO_MAXIMO_DA_BUSCA).optional(),
  depois: textoSemCaractereNulo().min(1).max(TAMANHO_MAXIMO_DO_CURSOR).optional(),
  limite: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITE_MAXIMO_DA_LISTAGEM_DE_PESSOAS)
    .default(LIMITE_PADRAO_DA_LISTAGEM_DE_PESSOAS),
});

export type FiltroDePessoas = z.infer<typeof FiltroDePessoas>;

export interface PaginaDePessoas {
  readonly itens: readonly Pessoa[];
  readonly proxima: string | null;
}
