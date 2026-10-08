import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BancoModule } from '../banco/banco.module.js';
import { BordaTransacionalInterceptor } from './borda-transacional.interceptor.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoDoAcesso } from './provedor-de-contexto-de-instituicao.do-acesso.js';
import { VerificadorDeModoDeTransacaoDasRotas } from './verificador-de-modo-de-transacao-das-rotas.js';

@Module({
  imports: [BancoModule, DiscoveryModule],
  providers: [
    BordaTransacionalInterceptor,
    VerificadorDeModoDeTransacaoDasRotas,
    { provide: ProvedorDeContextoDeInstituicao, useClass: ProvedorDeContextoDeInstituicaoDoAcesso },
  ],
  exports: [BordaTransacionalInterceptor, ProvedorDeContextoDeInstituicao],
})
export class BordaTransacionalModule {}
