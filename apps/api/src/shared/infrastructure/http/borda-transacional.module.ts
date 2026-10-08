import { Module } from '@nestjs/common';
import { BancoModule } from '../banco/banco.module.js';
import { BordaTransacionalInterceptor } from './borda-transacional.interceptor.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoDoAcesso } from './provedor-de-contexto-de-instituicao.do-acesso.js';

@Module({
  imports: [BancoModule],
  providers: [
    BordaTransacionalInterceptor,
    { provide: ProvedorDeContextoDeInstituicao, useClass: ProvedorDeContextoDeInstituicaoDoAcesso },
  ],
  exports: [BordaTransacionalInterceptor, ProvedorDeContextoDeInstituicao],
})
export class BordaTransacionalModule {}
