import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Publico } from '../autenticacao/marcas-de-acesso.js';
import { VerificadorDeProntidao } from './verificador-de-prontidao.js';

interface RespostaComStatus {
  status(codigo: number): unknown;
}

interface EstadoDeSaude {
  status: 'viva';
}

interface EstadoDeProntidao {
  status: 'pronta';
}

export const CORPO_DE_INDISPONIVEL = { status: 'indisponivel' } as const;

@Publico()
@Controller('saude')
export class SaudeController {
  constructor(private readonly verificadorDeProntidao: VerificadorDeProntidao) {}

  @Get('viva')
  viva(): EstadoDeSaude {
    return { status: 'viva' };
  }

  @Get('pronta')
  async pronta(@Res({ passthrough: true }) resposta: RespostaComStatus): Promise<EstadoDeProntidao | typeof CORPO_DE_INDISPONIVEL> {
    const resultado = await this.verificadorDeProntidao.verificar();
    if (!resultado.pronta) {
      resposta.status(HttpStatus.SERVICE_UNAVAILABLE);
      return CORPO_DE_INDISPONIVEL;
    }
    return { status: 'pronta' };
  }
}
