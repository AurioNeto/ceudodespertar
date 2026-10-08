import { describe, expect, it } from 'vitest';
import { Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ModoDeTransacao } from './modo-de-transacao.decorator.js';
import { SemTransacaoNaBorda } from './sem-transacao-na-borda.decorator.js';
import {
  ErroDeRotaQueMudaEstadoSemModoGravavel,
  VerificadorDeModoDeTransacaoDasRotas,
} from './verificador-de-modo-de-transacao-das-rotas.js';

@Controller('sem-marca')
class RotasDeLeituraSemMarca {
  @Get()
  listar(): void {}
}

@Controller('com-marca-no-metodo')
class RotasComMarcaNoMetodo {
  @ModoDeTransacao('escrita')
  @Post()
  criar(): void {}

  @ModoDeTransacao('leitura-que-grava')
  @Put()
  substituir(): void {}
}

@ModoDeTransacao('escrita')
@Controller('com-marca-na-classe')
class RotasComMarcaNaClasse {
  @Post()
  criar(): void {}

  @Delete()
  remover(): void {}
}

@SemTransacaoNaBorda()
@Controller('sem-transacao')
class PostForaDaBorda {
  @Post()
  criar(): void {}
}

@Controller('post-sem-marca')
class PostSemMarca {
  @Post()
  criar(): void {}
}

@Controller('mistas')
class RotasMistas {
  @Patch()
  alterar(): void {}

  @ModoDeTransacao('leitura')
  @Post('busca')
  buscar(): void {}

  @ModoDeTransacao('escrita')
  @Post()
  criar(): void {}
}

async function subirCom(...controladores: Function[]): Promise<void> {
  const modulo = await Test.createTestingModule({
    imports: [DiscoveryModule],
    controllers: controladores as never[],
    providers: [VerificadorDeModoDeTransacaoDasRotas],
  }).compile();
  await modulo.init();
  await modulo.close();
}

describe('VerificadorDeModoDeTransacaoDasRotas', () => {
  it('aceita rota de leitura sem marca', async () => {
    await expect(subirCom(RotasDeLeituraSemMarca)).resolves.toBeUndefined();
  });

  it('aceita rota que muda estado com modo gravável no método, escrita ou leitura-que-grava', async () => {
    await expect(subirCom(RotasComMarcaNoMetodo)).resolves.toBeUndefined();
  });

  it('aceita rota que muda estado com modo gravável herdado da classe', async () => {
    await expect(subirCom(RotasComMarcaNaClasse)).resolves.toBeUndefined();
  });

  it('aceita rota que mudaria estado mas dispensa a transação da borda', async () => {
    await expect(subirCom(PostForaDaBorda)).resolves.toBeUndefined();
  });

  it('recusa a partida com POST sem modo de transação, nomeando a rota', async () => {
    await expect(subirCom(PostSemMarca)).rejects.toThrow(ErroDeRotaQueMudaEstadoSemModoGravavel);
    await expect(subirCom(PostSemMarca)).rejects.toThrow('PostSemMarca.criar (POST)');
  });

  it('recusa PATCH sem marca e POST marcado como leitura, e lista todas as rotas erradas', async () => {
    const falha = await subirCom(RotasMistas).then(
      () => undefined,
      (erro: unknown) => erro,
    );

    expect(falha).toBeInstanceOf(ErroDeRotaQueMudaEstadoSemModoGravavel);
    const mensagem = (falha as Error).message;
    expect(mensagem).toContain('RotasMistas.alterar (PATCH)');
    expect(mensagem).toContain('RotasMistas.buscar (POST)');
    expect(mensagem).not.toContain('RotasMistas.criar');
  });
});
