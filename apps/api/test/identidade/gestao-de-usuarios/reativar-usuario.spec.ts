import { describe, expect, it } from 'vitest';
import { ReativarUsuario } from '../../../src/modules/identidade/application/usuarios/reativar-usuario.js';
import type { ComandoDeReativacao } from '../../../src/modules/identidade/application/usuarios/reativar-usuario.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import {
  ACESSO,
  ALVO,
  GRUPO_LEITURA,
  RelogioFixo,
  RepositorioDeUsuarioEmMemoria,
  UnidadeDeTrabalhoFalsa,
  usuarioEm,
} from './dubles.js';

const VERSAO_DO_ALVO = 3;

function comando(sobrescritas: Partial<ComandoDeReativacao> = {}): ComandoDeReativacao {
  return { usuarioId: ALVO, versaoEsperada: VERSAO_DO_ALVO, motivo: 'voltou das férias', ...sobrescritas };
}

function montar(situacao: Parameters<typeof usuarioEm>[1]) {
  const usuario = usuarioEm(ALVO, situacao, [GRUPO_LEITURA], VERSAO_DO_ALVO);
  const repositorio = new RepositorioDeUsuarioEmMemoria([usuario]);
  const unidadeDeTrabalho = new UnidadeDeTrabalhoFalsa();
  const reativar = new ReativarUsuario(unidadeDeTrabalho, repositorio, new RelogioFixo());
  return { usuario, repositorio, unidadeDeTrabalho, reativar };
}

describe('ReativarUsuario', () => {
  it('reativa o suspenso com o motivo no evento, salva e devolve a nova versão, numa transação de escrita', async () => {
    const { usuario, repositorio, unidadeDeTrabalho, reativar } = montar('SUSPENSO');

    const resultado = await reativar.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({ situacao: 'ATIVO', versao: VERSAO_DO_ALVO + 1 });
    expect(repositorio.salvos).toEqual([usuario]);
    expect(usuario.retirarEventos()).toMatchObject([
      { tipo: 'USUARIO_REATIVADO', dados: { autorId: ACESSO.usuarioId, motivo: 'voltou das férias' } },
    ]);
    expect(unidadeDeTrabalho.modos).toEqual(['escrita']);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para id desconhecido', async () => {
    const { reativar } = montar('SUSPENSO');

    const resultado = await reativar.executar(ACESSO, comando({ usuarioId: 'outro-id' as typeof ALVO }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA antes de mutar quando a versão diverge', async () => {
    const { usuario, repositorio, reativar } = montar('SUSPENSO');

    const resultado = await reativar.executar(ACESSO, comando({ versaoEsperada: VERSAO_DO_ALVO + 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(usuario.situacao).toBe('SUSPENSO');
    expect(repositorio.salvos).toEqual([]);
  });

  it.each(['CONVITE_PENDENTE', 'REVOGADO'] as const)(
    'recusa o alvo %s com SITUACAO_DO_USUARIO_NAO_PERMITE',
    async (situacao) => {
      const { reativar } = montar(situacao);

      const resultado = await reativar.executar(ACESSO, comando());

      expect(ehErr(resultado) && resultado.erro.codigo).toBe('SITUACAO_DO_USUARIO_NAO_PERMITE');
    },
  );

  it('recusa motivo vazio com MOTIVO_OBRIGATORIO sem salvar', async () => {
    const { repositorio, reativar } = montar('SUSPENSO');

    const resultado = await reativar.executar(ACESSO, comando({ motivo: ' ' }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('MOTIVO_OBRIGATORIO');
    expect(repositorio.salvos).toEqual([]);
  });

  it('usuário já ativo responde sucesso sem salvar nem mudar a versão', async () => {
    const { repositorio, reativar } = montar('ATIVO');

    const resultado = await reativar.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({ situacao: 'ATIVO', versao: VERSAO_DO_ALVO });
    expect(repositorio.salvos).toEqual([]);
  });
});
