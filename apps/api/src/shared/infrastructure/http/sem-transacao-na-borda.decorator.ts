import { SetMetadata } from '@nestjs/common';

export const CHAVE_DE_SEM_TRANSACAO_NA_BORDA = 'cdd:sem-transacao-na-borda';

export const SemTransacaoNaBorda = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_DE_SEM_TRANSACAO_NA_BORDA, true);
