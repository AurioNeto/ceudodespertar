import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { VerificadorDeProntidao } from './verificador-de-prontidao.js';

interface EstadoDeSaude {
  status: 'viva';
}

interface EstadoDeProntidao {
  status: 'pronta';
}

export const CORPO_DE_INDISPONIVEL = { status: 'indisponivel' } as const;

@Controller('saude')
export class SaudeController {
  constructor(private readonly verificadorDeProntidao: VerificadorDeProntidao) {}

  @Get('viva')
  viva(): EstadoDeSaude {
    return { status: 'viva' };
  }

  @Get('pronta')
  async pronta(): Promise<EstadoDeProntidao> {
    const resultado = await this.verificadorDeProntidao.verificar();
    if (!resultado.pronta) {
      throw new ServiceUnavailableException(CORPO_DE_INDISPONIVEL);
    }
    return { status: 'pronta' };
  }
}
