import type { GrupoId, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ehErr, ehOk, ok } from '../../../../shared/kernel/result.js';
import { AlteracaoQuePodeTirarAdministrador } from './alteracao-que-pode-tirar-administrador.js';
import type { AlteracaoPendente, EfeitoNaAdministracao } from './alteracao-que-pode-tirar-administrador.js';
import { LeitorDaAdministracao } from './leitor-da-administracao.js';
import type { FotografiaDaAdministracao } from './leitor-da-administracao.js';
import { TravaDaAdministracao } from './trava-da-administracao.js';
import { PoliticaDoUltimoAdministrador } from '../../domain/servicos/politica-do-ultimo-administrador.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';

const INSTITUICAO = 'a0000000-0000-7000-8000-000000000000' as InstituicaoId;
const ADMINISTRADOR = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;
const COMUM = 'a1000000-0000-7000-8000-000000000002' as UsuarioId;
const GRUPO_ADMIN = 'b1000000-0000-7000-8000-000000000001' as GrupoId;
const ACESSO = { usuarioId: COMUM, instituicaoId: INSTITUICAO };

const FOTOGRAFIA: FotografiaDaAdministracao = {
  usuarios: [
    { id: ADMINISTRADOR, situacao: 'ATIVO', grupos: [GRUPO_ADMIN] },
    { id: COMUM, situacao: 'ATIVO', grupos: [] },
  ],
  gruposAtivos: [{ id: GRUPO_ADMIN, permissoes: ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'] }],
};

class UnidadeDeTrabalhoFalsa extends UnidadeDeTrabalho {
  readonly modos: ModoDeTransacao[] = [];

  transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modos.push(modo);
    return fn({} as ContextoDaTransacao);
  }
}

class TravaEspia extends TravaDaAdministracao {
  readonly instituicoes: InstituicaoId[] = [];

  constructor(private readonly passos: string[]) {
    super();
  }

  adquirir(instituicaoId: InstituicaoId): Promise<void> {
    this.passos.push('trava');
    this.instituicoes.push(instituicaoId);
    return Promise.resolve();
  }
}

class LeitorEspia extends LeitorDaAdministracao {
  constructor(private readonly passos: string[]) {
    super();
  }

  instituicao(): Promise<FotografiaDaAdministracao> {
    this.passos.push('leitura');
    return Promise.resolve(FOTOGRAFIA);
  }
}

class PoliticaEspia extends PoliticaDoUltimoAdministrador {
  constructor(private readonly passos: string[]) {
    super();
  }

  override verificar(...argumentos: Parameters<PoliticaDoUltimoAdministrador['verificar']>) {
    this.passos.push('politica');
    return super.verificar(...argumentos);
  }
}

function montar() {
  const passos: string[] = [];
  const unidadeDeTrabalho = new UnidadeDeTrabalhoFalsa();
  const trava = new TravaEspia(passos);
  const servico = new AlteracaoQuePodeTirarAdministrador(
    unidadeDeTrabalho,
    trava,
    new LeitorEspia(passos),
    new PoliticaEspia(passos),
  );
  return { passos, unidadeDeTrabalho, trava, servico };
}

function alteracao(passos: string[], efeito: EfeitoNaAdministracao): AlteracaoPendente<string> {
  return {
    efeito,
    salvar: () => {
      passos.push('salvar');
      return Promise.resolve('salvo');
    },
  };
}

const SUSPENDER_ADMINISTRADOR: EfeitoNaAdministracao = {
  tipo: 'usuario',
  usuarioId: ADMINISTRADOR,
  situacao: 'SUSPENSO',
  grupos: [GRUPO_ADMIN],
};

describe('AlteracaoQuePodeTirarAdministrador', () => {
  it('adquire a trava antes de ler, lê antes de mutar e verifica a política antes de salvar', async () => {
    const { passos, servico } = montar();

    await servico.executar({
      acesso: ACESSO,
      mutar: () => {
        passos.push('mutacao');
        return Promise.resolve(
          ok(alteracao(passos, { tipo: 'usuario', usuarioId: COMUM, situacao: 'SUSPENSO', grupos: [] })),
        );
      },
    });

    expect(passos).toEqual(['trava', 'leitura', 'mutacao', 'politica', 'salvar']);
  });

  it('trava a instituição do acesso, em transação de escrita, e entrega a leitura à mutação', async () => {
    const { trava, unidadeDeTrabalho, servico } = montar();
    let recebida: FotografiaDaAdministracao | undefined;

    await servico.executar({
      acesso: ACESSO,
      mutar: (antes) => {
        recebida = antes;
        return Promise.resolve(err(erroDeDominio('RECURSO_NAO_ENCONTRADO')));
      },
    });

    expect(trava.instituicoes).toEqual([INSTITUICAO]);
    expect(unidadeDeTrabalho.modos).toEqual(['escrita']);
    expect(recebida).toBe(FOTOGRAFIA);
  });

  it('devolve o erro da mutação sem verificar a política nem salvar', async () => {
    const { passos, servico } = montar();

    const resultado = await servico.executar({
      acesso: ACESSO,
      mutar: () => Promise.resolve(err(erroDeDominio('VERSAO_DESATUALIZADA'))),
    });

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(passos).toEqual(['trava', 'leitura']);
  });

  it('recusa por ULTIMO_ADMINISTRADOR quando a mudança de usuário zera os administradores, sem salvar', async () => {
    const { passos, servico } = montar();

    const resultado = await servico.executar({
      acesso: ACESSO,
      mutar: () => Promise.resolve(ok(alteracao(passos, SUSPENDER_ADMINISTRADOR))),
    });

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    expect(passos).toEqual(['trava', 'leitura', 'politica']);
  });

  it('recusa quando a mudança de permissões do grupo zera quem gerencia usuários', async () => {
    const { passos, servico } = montar();

    const resultado = await servico.executar({
      acesso: ACESSO,
      mutar: () =>
        Promise.resolve(
          ok(alteracao(passos, { tipo: 'grupo', grupoId: GRUPO_ADMIN, permissoes: ['sistema.grupo.gerenciar'] })),
        ),
    });

    expect(ehErr(resultado) && resultado.erro.detalhes).toMatchObject({ permissao: 'sistema.usuario.gerenciar' });
  });

  it('recusa quando a mudança de permissões do grupo zera quem gerencia grupos', async () => {
    const { passos, servico } = montar();

    const resultado = await servico.executar({
      acesso: ACESSO,
      mutar: () =>
        Promise.resolve(
          ok(alteracao(passos, { tipo: 'grupo', grupoId: GRUPO_ADMIN, permissoes: ['sistema.usuario.gerenciar'] })),
        ),
    });

    expect(ehErr(resultado) && resultado.erro.detalhes).toMatchObject({ permissao: 'sistema.grupo.gerenciar' });
  });

  it('devolve o valor do salvamento quando a política aceita, sem reler a instituição', async () => {
    const { passos, servico } = montar();

    const resultado = await servico.executar({
      acesso: ACESSO,
      mutar: () =>
        Promise.resolve(ok(alteracao(passos, { tipo: 'usuario', usuarioId: COMUM, situacao: 'SUSPENSO', grupos: [] }))),
    });

    expect(ehOk(resultado) && resultado.valor).toBe('salvo');
    expect(passos.filter((passo) => passo === 'leitura')).toHaveLength(1);
  });
});
