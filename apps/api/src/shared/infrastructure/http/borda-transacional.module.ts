import { Module } from '@nestjs/common';
import { BancoModule } from '../banco/banco.module.js';
import { BordaTransacionalInterceptor } from './borda-transacional.interceptor.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoFake as ProvedorDeContextoDeInstituicaoAteOAuthGuardExistir } from './provedor-de-contexto-de-instituicao.fake.js';

@Module({
  imports: [BancoModule],
  providers: [
    BordaTransacionalInterceptor,
    {
      provide: ProvedorDeContextoDeInstituicao,
      useClass: ProvedorDeContextoDeInstituicaoAteOAuthGuardExistir,
    },
  ],
  exports: [BordaTransacionalInterceptor, ProvedorDeContextoDeInstituicao],
})
export class BordaTransacionalModule {}
