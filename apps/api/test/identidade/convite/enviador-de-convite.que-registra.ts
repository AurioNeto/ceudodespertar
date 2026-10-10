import { Injectable, Logger } from '@nestjs/common';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';

@Injectable()
export class EnviadorDeConviteQueRegistra extends EnviadorDeConvite {
  private readonly logger = new Logger(EnviadorDeConviteQueRegistra.name);

  enviar({ usuarioId }: ConviteParaEnviar): Promise<void> {
    this.logger.warn(`convite pendente de envio (usuário ${usuarioId})`);
    return Promise.resolve();
  }
}
