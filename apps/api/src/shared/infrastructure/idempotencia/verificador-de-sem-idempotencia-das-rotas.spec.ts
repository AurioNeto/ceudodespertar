import { describe, expect, it } from 'vitest';
import { Controller, Post } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  ApenasIdentificado,
  ApenasUsuarioAtivo,
  Publico,
  RequerAlgumaPermissao,
  RequerPermissao,
} from '../autenticacao/marcas-de-acesso.js';
import { SemIdempotencia } from './sem-idempotencia.decorator.js';
import {
  ErroDeSemIdempotenciaEmRotaComInstituicao,
  VerificadorDeSemIdempotenciaDasRotas,
} from './verificador-de-sem-idempotencia-das-rotas.js';

@Controller('identificado')
class SemIdempotenciaEmRotaIdentificada {
  @ApenasIdentificado()
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Controller('publico')
class SemIdempotenciaEmRotaPublica {
  @Publico()
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@SemIdempotencia()
@ApenasIdentificado()
@Controller('identificado-na-classe')
class SemIdempotenciaNaClasseIdentificada {
  @Post()
  criar(): void {}
}

@Controller('com-permissao')
class SemIdempotenciaEmRotaComPermissao {
  @RequerPermissao('financeiro.lancamento.registrar')
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Controller('com-alguma-permissao')
class SemIdempotenciaEmRotaComAlgumaPermissao {
  @RequerAlgumaPermissao('financeiro.lancamento.registrar')
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Controller('usuario-ativo')
class SemIdempotenciaEmRotaDeUsuarioAtivo {
  @ApenasUsuarioAtivo()
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Controller('identificado-e-com-permissao')
class SemIdempotenciaEmRotaIdentificadaEComPermissao {
  @ApenasIdentificado()
  @RequerPermissao('financeiro.lancamento.registrar')
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@Controller('permissao-e-identificado')
class SemIdempotenciaEmRotaComPermissaoEIdentificada {
  @RequerPermissao('financeiro.lancamento.registrar')
  @ApenasIdentificado()
  @SemIdempotencia()
  @Post()
  criar(): void {}
}

@SemIdempotencia()
@RequerPermissao('financeiro.lancamento.registrar')
@Controller('classe-com-permissao')
class SemIdempotenciaNaClasseComPermissao {
  @Post()
  criar(): void {}
}

@SemIdempotencia()
@Controller('sem-marca-de-acesso')
class SemIdempotenciaSemMarcaDeAcesso {
  @Post()
  criar(): void {}
}

@Controller('com-permissao-sem-marca-de-idempotencia')
class RotaComPermissaoSemMarcaDeIdempotencia {
  @RequerPermissao('financeiro.lancamento.registrar')
  @Post()
  criar(): void {}
}

@Controller('mistas')
class RotasMistas {
  @ApenasIdentificado()
  @SemIdempotencia()
  @Post('a')
  aceita(): void {}

  @RequerPermissao('financeiro.lancamento.registrar')
  @SemIdempotencia()
  @Post('b')
  recusada(): void {}
}

async function subirCom(...controladores: Function[]): Promise<void> {
  const modulo = await Test.createTestingModule({
    imports: [DiscoveryModule],
    controllers: controladores as never[],
    providers: [VerificadorDeSemIdempotenciaDasRotas],
  }).compile();
  await modulo.init();
  await modulo.close();
}

describe('VerificadorDeSemIdempotenciaDasRotas', () => {
  it.each([
    ['@ApenasIdentificado no método', SemIdempotenciaEmRotaIdentificada],
    ['@Publico no método', SemIdempotenciaEmRotaPublica],
    ['@ApenasIdentificado herdado da classe', SemIdempotenciaNaClasseIdentificada],
    ['rota com permissão sem a marca de idempotência', RotaComPermissaoSemMarcaDeIdempotencia],
  ])('aceita a partida com %s', async (_descricao, controlador) => {
    await expect(subirCom(controlador)).resolves.toBeUndefined();
  });

  it.each([
    ['@RequerPermissao', SemIdempotenciaEmRotaComPermissao, 'SemIdempotenciaEmRotaComPermissao.criar'],
    ['@RequerAlgumaPermissao', SemIdempotenciaEmRotaComAlgumaPermissao, 'SemIdempotenciaEmRotaComAlgumaPermissao.criar'],
    ['@ApenasUsuarioAtivo', SemIdempotenciaEmRotaDeUsuarioAtivo, 'SemIdempotenciaEmRotaDeUsuarioAtivo.criar'],
    ['@RequerPermissao herdado da classe', SemIdempotenciaNaClasseComPermissao, 'SemIdempotenciaNaClasseComPermissao.criar'],
    [
      '@ApenasIdentificado e @RequerPermissao juntas',
      SemIdempotenciaEmRotaIdentificadaEComPermissao,
      'SemIdempotenciaEmRotaIdentificadaEComPermissao.criar',
    ],
    [
      '@RequerPermissao e @ApenasIdentificado juntas',
      SemIdempotenciaEmRotaComPermissaoEIdentificada,
      'SemIdempotenciaEmRotaComPermissaoEIdentificada.criar',
    ],
    ['ausência de marca de acesso', SemIdempotenciaSemMarcaDeAcesso, 'SemIdempotenciaSemMarcaDeAcesso.criar'],
  ])('recusa a partida com @SemIdempotencia em rota com %s, nomeando a rota', async (_descricao, controlador, rota) => {
    await expect(subirCom(controlador)).rejects.toThrow(ErroDeSemIdempotenciaEmRotaComInstituicao);
    await expect(subirCom(controlador)).rejects.toThrow(rota);
  });

  it('lista só as rotas recusadas quando há rotas aceitas no mesmo controller', async () => {
    const falha = await subirCom(RotasMistas).then(
      () => undefined,
      (erro: unknown) => erro,
    );

    const mensagem = (falha as Error).message;
    expect(mensagem).toContain('RotasMistas.recusada');
    expect(mensagem).not.toContain('RotasMistas.aceita');
  });
});
