import { Module } from '@nestjs/common';
import { SemeadoresDaInstituicao } from './semeadores-da-instituicao.js';

@Module({
  providers: [SemeadoresDaInstituicao],
  exports: [SemeadoresDaInstituicao],
})
export class SemeaduraModule {}
