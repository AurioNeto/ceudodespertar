import { Controller, Get } from '@nestjs/common';

interface EstadoDeSaude {
  status: 'viva';
}

@Controller('saude')
export class SaudeController {
  @Get('viva')
  viva(): EstadoDeSaude {
    return { status: 'viva' };
  }
}
