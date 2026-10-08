import { Injectable } from '@nestjs/common';

export abstract class Relogio {
  abstract agora(): Date;
}

@Injectable()
export class RelogioDoSistema extends Relogio {
  agora(): Date {
    return new Date();
  }
}
