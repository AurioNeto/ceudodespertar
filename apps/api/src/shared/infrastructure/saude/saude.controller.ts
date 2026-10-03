import { Controller, Get } from '@nestjs/common';
import { Publico } from '../autenticacao/marcas-de-acesso.js';

interface EstadoDeSaude {
  status: 'viva';
}

@Publico()
@Controller('saude')
export class SaudeController {
  @Get('viva')
  viva(): EstadoDeSaude {
    return { status: 'viva' };
  }
}
