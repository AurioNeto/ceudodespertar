import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiberacaoDiretaDoAcesso } from '../../../src/modules/identidade/application/usuarios/liberacao-direta-do-acesso.js';
import { ControleDeAcessoQueRegistra } from '../keycloak/controle-de-acesso-que-registra.js';
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
  const controle = new ControleDeAcessoQueRegistra();
  const liberacao = new LiberacaoDiretaDoAcesso(controle);
  const reativar = new ReativarUsuario(unidadeDeTrabalho, repositorio, new RelogioFixo(), liberacao);
  return { usuario, repositorio, unidadeDeTrabalho, controle, liberacao, reativar };
}

describe('ReativarUsuario', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('libera o acesso no provedor direto, só depois da confirmação da transação', async () => {
    const { unidadeDeTrabalho, controle, liberacao, reativar } = montar('SUSPENSO');

    await reativar.executar(ACESSO, comando());
    expect(controle.chamadas).toEqual([]);
    unidadeDeTrabalho.confirmar();
    await liberacao.aguardarLiberacoes();

    expect(controle.chamadas).toEqual([{ operacao: 'liberar', sujeito: 'sub' }]);
  });

  it('usuário já ativo também libera no provedor, para curar acesso travado', async () => {
    const { unidadeDeTrabalho, controle, liberacao, reativar } = montar('ATIVO');

    await reativar.executar(ACESSO, comando());
    unidadeDeTrabalho.confirmar();
    await liberacao.aguardarLiberacoes();

    expect(controle.chamadas).toEqual([{ operacao: 'liberar', sujeito: 'sub' }]);
  });

  it('não libera no provedor quando a reativação é recusada', async () => {
    const { unidadeDeTrabalho, controle, liberacao, reativar } = montar('SUSPENSO');

    await reativar.executar(ACESSO, comando({ motivo: ' ' }));
    unidadeDeTrabalho.confirmar();
    await liberacao.aguardarLiberacoes();

    expect(controle.chamadas).toEqual([]);
  });

  it('falha na liberação direta vai só ao log e não propaga', async () => {
    const { unidadeDeTrabalho, controle, liberacao, reativar } = montar('SUSPENSO');
    controle.falharCom = new TypeError('Keycloak fora');
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const resultado = await reativar.executar(ACESSO, comando());
    unidadeDeTrabalho.confirmar();
    await liberacao.aguardarLiberacoes();

    expect(ehOk(resultado)).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('o desligamento só conclui depois da liberação direta em voo', async () => {
    const { unidadeDeTrabalho, controle, liberacao, reativar } = montar('SUSPENSO');
    let concluirLiberacao: () => void = () => undefined;
    controle.liberar = () => new Promise<void>((resolver) => (concluirLiberacao = resolver));

    await reativar.executar(ACESSO, comando());
    unidadeDeTrabalho.confirmar();
    let desligado = false;
    const desligamento = liberacao.onModuleDestroy().then(() => (desligado = true));
    await Promise.resolve();

    expect(desligado).toBe(false);
    concluirLiberacao();
    await desligamento;
    expect(desligado).toBe(true);
  });
});
