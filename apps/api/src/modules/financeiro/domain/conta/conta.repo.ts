import type { ContaId } from '@cdd/contracts';
import type { Conta } from './conta.js';

export abstract class RepositorioDeConta {
  abstract porId(id: ContaId): Promise<Conta | undefined>;
  abstract listar(): Promise<readonly Conta[]>;
  abstract adicionar(conta: Conta): Promise<void>;
  abstract salvar(conta: Conta): Promise<number>;
}
