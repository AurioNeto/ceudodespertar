import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { JWTVerifyGetKey } from 'jose';
import { AMBIENTE } from '../configuracao/esquema-de-ambiente.js';
import type { Ambiente } from '../configuracao/esquema-de-ambiente.js';
import { ResolvedorDeContextoDeAcesso } from './contexto-de-acesso.js';
import { GuardaDeAcesso } from './guarda-de-acesso.js';
import { ResolvedorDeContextoDeAcessoVazio } from './resolvedor-de-contexto-de-acesso-vazio.js';
import { CHAVES_DE_VERIFICACAO, criarChavesRemotas, VerificadorDeToken } from './verificador-de-token.js';

@Module({
  providers: [
    {
      provide: CHAVES_DE_VERIFICACAO,
      inject: [AMBIENTE],
      useFactory: (ambiente: Ambiente) => criarChavesRemotas(ambiente.OIDC_EMISSOR),
    },
    {
      provide: VerificadorDeToken,
      inject: [AMBIENTE, CHAVES_DE_VERIFICACAO],
      useFactory: (ambiente: Ambiente, chaves: JWTVerifyGetKey) =>
        new VerificadorDeToken({ emissor: ambiente.OIDC_EMISSOR, audiencia: ambiente.OIDC_AUDIENCIA, chaves }),
    },
    { provide: ResolvedorDeContextoDeAcesso, useClass: ResolvedorDeContextoDeAcessoVazio },
    { provide: APP_GUARD, useClass: GuardaDeAcesso },
  ],
})
export class AutenticacaoModule {}
