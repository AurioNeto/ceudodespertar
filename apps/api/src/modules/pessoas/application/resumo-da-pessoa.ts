import type { PessoaId, TipoPessoa } from '@cdd/contracts';

export interface PessoaResumida {
  readonly id: PessoaId;
  readonly nome: string;
  readonly tipo: TipoPessoa;
  readonly ativa: boolean;
}

/** Porta de consulta entre módulos; não publica o documento da pessoa. */
export abstract class ResumoDaPessoa {
  abstract porId(id: PessoaId): Promise<PessoaResumida | undefined>;
}
