import type { GrupoId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { DefinirGruposDoUsuario } from '../../../src/modules/identidade/application/usuarios/definir-grupos-do-usuario.js';
import type { ComandoDeDefinicaoDeGrupos } from '../../../src/modules/identidade/application/usuarios/definir-grupos-do-usuario.js';
import type { FotografiaDaAdministracao } from '../../../src/modules/identidade/application/administracao/leitor-da-administracao.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import {
  ACESSO,
  ALVO,
  GRUPO_ADMINISTRADOR,
  GRUPO_DE_OUTRA_INSTITUICAO,
  GRUPO_LEITURA,
  instituicaoComDoisAdministradores,
  instituicaoOndeOAlvoEOUnicoAdministrador,
  montarAlteracao,
  RelogioFixo,
  RepositorioDeUsuarioEmMemoria,
  usuarioEm,
} from './dubles.js';

const VERSAO_DO_ALVO = 3;

function comando(grupos: readonly GrupoId[], sobrescritas: Partial<ComandoDeDefinicaoDeGrupos> = {}): ComandoDeDefinicaoDeGrupos {
  return { usuarioId: ALVO, versaoEsperada: VERSAO_DO_ALVO, grupos, ...sobrescritas };
}

function montar(
  fotografia: FotografiaDaAdministracao,
  gruposDoAlvo: readonly GrupoId[],
  situacao: Parameters<typeof usuarioEm>[1] = 'ATIVO',
) {
  const usuario = usuarioEm(ALVO, situacao, gruposDoAlvo, VERSAO_DO_ALVO);
  const repositorio = new RepositorioDeUsuarioEmMemoria([usuario]);
  const definir = new DefinirGruposDoUsuario(montarAlteracao(fotografia), repositorio, new RelogioFixo());
  return { usuario, repositorio, definir };
}

describe('DefinirGruposDoUsuario', () => {
  it('troca os grupos, salva e devolve os grupos com a nova versão', async () => {
    const { usuario, repositorio, definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_ADMINISTRADOR]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_LEITURA]));

    expect(ehOk(resultado) && resultado.valor).toEqual({ grupos: [GRUPO_LEITURA], versao: VERSAO_DO_ALVO + 1 });
    expect(repositorio.salvos).toEqual([usuario]);
  });

  it('recusa retirar o grupo do último administrador, sem salvar', async () => {
    const { repositorio, definir } = montar(instituicaoOndeOAlvoEOUnicoAdministrador(), [GRUPO_ADMINISTRADOR]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_LEITURA]));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    expect(repositorio.salvos).toEqual([]);
  });

  it('aceita retirar o grupo de um administrador quando sobra outro', async () => {
    const { definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_ADMINISTRADOR]);

    expect(ehOk(await definir.executar(ACESSO, comando([])))).toBe(true);
  });

  it('devolve GRUPO_INEXISTENTE para grupo de outra instituição, sem mutar nem salvar', async () => {
    const { usuario, repositorio, definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_LEITURA, GRUPO_DE_OUTRA_INSTITUICAO]));

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'GRUPO_INEXISTENTE',
      detalhes: { grupos: [GRUPO_DE_OUTRA_INSTITUICAO] },
    });
    expect(usuario.grupos).toEqual([GRUPO_LEITURA]);
    expect(repositorio.salvos).toEqual([]);
  });

  it('mantém sem erro um grupo já atribuído que deixou de estar ativo', async () => {
    const { repositorio, definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA, GRUPO_DE_OUTRA_INSTITUICAO]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_LEITURA, GRUPO_DE_OUTRA_INSTITUICAO]));

    expect(ehOk(resultado) && resultado.valor.versao).toBe(VERSAO_DO_ALVO);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para id desconhecido', async () => {
    const { definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA]);

    const resultado = await definir.executar(ACESSO, comando([], { usuarioId: 'outro-id' as typeof ALVO }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA antes de mutar quando a versão diverge', async () => {
    const { usuario, repositorio, definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_ADMINISTRADOR], { versaoEsperada: 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(usuario.grupos).toEqual([GRUPO_LEITURA]);
    expect(repositorio.salvos).toEqual([]);
  });

  it('definir os mesmos grupos responde sucesso sem salvar nem mudar a versão', async () => {
    const { repositorio, definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA]);

    const resultado = await definir.executar(ACESSO, comando([GRUPO_LEITURA]));

    expect(ehOk(resultado) && resultado.valor).toEqual({ grupos: [GRUPO_LEITURA], versao: VERSAO_DO_ALVO });
    expect(repositorio.salvos).toEqual([]);
  });

  it('recusa o alvo REVOGADO com SITUACAO_DO_USUARIO_NAO_PERMITE', async () => {
    const { definir } = montar(instituicaoComDoisAdministradores(), [GRUPO_LEITURA], 'REVOGADO');

    const resultado = await definir.executar(ACESSO, comando([GRUPO_ADMINISTRADOR]));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('SITUACAO_DO_USUARIO_NAO_PERMITE');
  });
});
