import type { GrupoId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { DesativarUsuario } from '../../../src/modules/identidade/application/usuarios/desativar-usuario.js';
import type { ComandoDeDesativacao } from '../../../src/modules/identidade/application/usuarios/desativar-usuario.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import {
  ACESSO,
  ALVO,
  GRUPO_ADMINISTRADOR,
  GRUPO_LEITURA,
  instituicaoComDoisAdministradores,
  instituicaoOndeOAlvoEOUnicoAdministrador,
  montarAlteracao,
  RelogioFixo,
  RepositorioDeUsuarioEmMemoria,
  usuarioEm,
} from './dubles.js';
import type { FotografiaDaAdministracao } from '../../../src/modules/identidade/application/administracao/leitor-da-administracao.js';

const VERSAO_DO_ALVO = 3;

function comando(sobrescritas: Partial<ComandoDeDesativacao> = {}): ComandoDeDesativacao {
  return { usuarioId: ALVO, versaoEsperada: VERSAO_DO_ALVO, motivo: 'saiu da casa', ...sobrescritas };
}

function montar(
  fotografia: FotografiaDaAdministracao,
  situacao: Parameters<typeof usuarioEm>[1] = 'ATIVO',
  grupos: readonly GrupoId[] = [GRUPO_LEITURA],
) {
  const usuario = usuarioEm(ALVO, situacao, grupos, VERSAO_DO_ALVO);
  const repositorio = new RepositorioDeUsuarioEmMemoria([usuario]);
  const desativar = new DesativarUsuario(montarAlteracao(fotografia), repositorio, new RelogioFixo());
  return { usuario, repositorio, desativar };
}

describe('DesativarUsuario', () => {
  it('suspende o usuário, salva e devolve a situação com a nova versão', async () => {
    const { usuario, repositorio, desativar } = montar(instituicaoComDoisAdministradores(), 'ATIVO', [GRUPO_ADMINISTRADOR]);

    const resultado = await desativar.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({ situacao: 'SUSPENSO', versao: VERSAO_DO_ALVO + 1 });
    expect(repositorio.salvos).toEqual([usuario]);
  });

  it('recusa quando o alvo é o último administrador, sem salvar', async () => {
    const { repositorio, desativar } = montar(instituicaoOndeOAlvoEOUnicoAdministrador(), 'ATIVO', [GRUPO_ADMINISTRADOR]);

    const resultado = await desativar.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('ULTIMO_ADMINISTRADOR');
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para id desconhecido na instituição', async () => {
    const { repositorio, desativar } = montar(instituicaoComDoisAdministradores());

    const resultado = await desativar.executar(ACESSO, comando({ usuarioId: 'outro-id' as typeof ALVO }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve VERSAO_DESATUALIZADA antes de mutar quando a versão diverge', async () => {
    const { usuario, repositorio, desativar } = montar(instituicaoComDoisAdministradores());

    const resultado = await desativar.executar(ACESSO, comando({ versaoEsperada: VERSAO_DO_ALVO - 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(usuario.situacao).toBe('ATIVO');
    expect(usuario.possuiEventosPendentes).toBe(false);
    expect(repositorio.salvos).toEqual([]);
  });

  it.each(['CONVITE_PENDENTE', 'REVOGADO'] as const)(
    'recusa o alvo %s com SITUACAO_DO_USUARIO_NAO_PERMITE',
    async (situacao) => {
      const { desativar } = montar(instituicaoComDoisAdministradores(), situacao);

      const resultado = await desativar.executar(ACESSO, comando());

      expect(ehErr(resultado) && resultado.erro).toEqual({
        codigo: 'SITUACAO_DO_USUARIO_NAO_PERMITE',
        detalhes: { situacao },
      });
    },
  );

  it('recusa motivo vazio com MOTIVO_OBRIGATORIO e motivo longo com MOTIVO_LONGO_DEMAIS', async () => {
    const { desativar } = montar(instituicaoComDoisAdministradores());

    const vazio = await desativar.executar(ACESSO, comando({ motivo: '  ' }));
    const longo = await desativar.executar(ACESSO, comando({ motivo: 'a'.repeat(501) }));

    expect(ehErr(vazio) && vazio.erro.codigo).toBe('MOTIVO_OBRIGATORIO');
    expect(ehErr(longo) && longo.erro.codigo).toBe('MOTIVO_LONGO_DEMAIS');
  });

  it('usuário já suspenso responde sucesso sem salvar nem mudar a versão', async () => {
    const { repositorio, desativar } = montar(instituicaoComDoisAdministradores(), 'SUSPENSO');

    const resultado = await desativar.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({ situacao: 'SUSPENSO', versao: VERSAO_DO_ALVO });
    expect(repositorio.salvos).toEqual([]);
  });
});
