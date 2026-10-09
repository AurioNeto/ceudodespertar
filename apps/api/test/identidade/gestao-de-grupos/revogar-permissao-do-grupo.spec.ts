import { describe, expect, it } from 'vitest';
import type { FotografiaDaAdministracao } from '../../../src/modules/identidade/application/administracao/leitor-da-administracao.js';
import { RevogarPermissaoDoGrupo } from '../../../src/modules/identidade/application/grupos/revogar-permissao-do-grupo.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import {
  ACESSO,
  ALVO,
  AUTOR,
  GRUPO_ADMINISTRADOR,
  GRUPO_LEITURA,
  instituicaoComDoisAdministradores,
  montarAlteracao,
  RelogioFixo,
} from '../gestao-de-usuarios/dubles.js';
import { grupoEm, RepositorioDeGrupoEmMemoria, VERSAO_DO_GRUPO } from './dubles.js';

const PERMISSOES_DE_ADMINISTRADOR = ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'] as const;

function montar(fotografia: FotografiaDaAdministracao, grupos = [grupoEm(GRUPO_ADMINISTRADOR, PERMISSOES_DE_ADMINISTRADOR)]) {
  const repositorio = new RepositorioDeGrupoEmMemoria(grupos);
  return { repositorio, revogar: new RevogarPermissaoDoGrupo(montarAlteracao(fotografia), repositorio, new RelogioFixo()) };
}

function instituicaoComUmAdministrador(): FotografiaDaAdministracao {
  return {
    usuarios: [
      { id: AUTOR, situacao: 'ATIVO', grupos: [GRUPO_LEITURA] },
      { id: ALVO, situacao: 'ATIVO', grupos: [GRUPO_ADMINISTRADOR] },
    ],
    gruposAtivos: [
      { id: GRUPO_ADMINISTRADOR, permissoes: PERMISSOES_DE_ADMINISTRADOR },
      { id: GRUPO_LEITURA, permissoes: ['financeiro.lancamento.ler'] },
    ],
  };
}

const comando = (sobrescritas = {}) => ({
  grupoId: GRUPO_ADMINISTRADOR,
  versaoEsperada: VERSAO_DO_GRUPO,
  permissao: 'sistema.grupo.gerenciar',
  ...sobrescritas,
});

describe('RevogarPermissaoDoGrupo', () => {
  it('recusa quando o grupo é o único que dá sistema.grupo.gerenciar, sem salvar', async () => {
    const { repositorio, revogar } = montar(instituicaoComDoisAdministradores());

    const resultado = await revogar.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    expect(repositorio.salvos).toEqual([]);
  });

  it('recusa quando o grupo é o único que dá sistema.usuario.gerenciar, sem salvar', async () => {
    const { repositorio, revogar } = montar(instituicaoComUmAdministrador());

    const resultado = await revogar.executar(ACESSO, comando({ permissao: 'sistema.usuario.gerenciar' }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    expect(repositorio.salvos).toEqual([]);
  });

  it('revoga, salva e devolve as permissões restantes quando outro grupo ativo ainda dá a permissão', async () => {
    const fotografia: FotografiaDaAdministracao = {
      usuarios: [
        { id: AUTOR, situacao: 'ATIVO', grupos: [GRUPO_LEITURA] },
        { id: ALVO, situacao: 'ATIVO', grupos: [GRUPO_ADMINISTRADOR, GRUPO_LEITURA] },
      ],
      gruposAtivos: [
        { id: GRUPO_ADMINISTRADOR, permissoes: PERMISSOES_DE_ADMINISTRADOR },
        { id: GRUPO_LEITURA, permissoes: ['sistema.grupo.gerenciar'] },
      ],
    };
    const { repositorio, revogar } = montar(fotografia);

    const resultado = await revogar.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({
      permissoes: ['sistema.usuario.gerenciar'],
      versao: VERSAO_DO_GRUPO + 1,
    });
    expect(repositorio.salvos).toHaveLength(1);
  });

  it('revogar permissão que o grupo não tem não salva e mantém a versão', async () => {
    const { repositorio, revogar } = montar(instituicaoComUmAdministrador());

    const resultado = await revogar.executar(ACESSO, comando({ permissao: 'financeiro.lancamento.ler' }));

    expect(ehOk(resultado) && resultado.valor.versao).toBe(VERSAO_DO_GRUPO);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve VERSAO_DESATUALIZADA sem mutar quando a versão diverge', async () => {
    const grupo = grupoEm(GRUPO_ADMINISTRADOR, PERMISSOES_DE_ADMINISTRADOR);
    const { repositorio, revogar } = montar(instituicaoComDoisAdministradores(), [grupo]);

    const resultado = await revogar.executar(ACESSO, comando({ versaoEsperada: VERSAO_DO_GRUPO - 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(grupo.permissoes).toEqual(['sistema.grupo.gerenciar', 'sistema.usuario.gerenciar']);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para grupo desconhecido e PERMISSAO_INEXISTENTE para código fora do catálogo', async () => {
    const semGrupo = montar(instituicaoComDoisAdministradores(), []);
    const comGrupo = montar(instituicaoComDoisAdministradores());

    const desconhecido = await semGrupo.revogar.executar(ACESSO, comando());
    const inexistente = await comGrupo.revogar.executar(ACESSO, comando({ permissao: 'inventada.coisa.fazer' }));

    expect(ehErr(desconhecido) && desconhecido.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
    expect(ehErr(inexistente) && inexistente.erro.codigo).toBe('PERMISSAO_INEXISTENTE');
  });
});
