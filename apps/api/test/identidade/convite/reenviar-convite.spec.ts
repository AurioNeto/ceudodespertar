import type { UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ReenviarConvite } from '../../../src/modules/identidade/application/usuarios/reenviar-convite.js';
import { Convite } from '../../../src/modules/identidade/domain/usuario/convite.js';
import { expiracaoMaximaDoConvite } from '../../../src/modules/identidade/domain/usuario/convite.js';
import { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { ACESSO, ALVO, AGORA, RelogioFixo } from '../gestao-de-usuarios/dubles.js';
import { GeradorFixo, montarEntrega, RepositorioQueGuardaAdicionados, TOKEN_EM_CLARO } from './dubles-de-convite.js';

const VERSAO = 4;
const HASH_ANTIGO = 'f'.repeat(64);

function usuarioEm(situacao: 'CONVITE_PENDENTE' | 'ATIVO' | 'SUSPENSO' | 'REVOGADO'): Usuario {
  return Usuario.reconstituir(
    {
      id: ALVO,
      pessoaId: null,
      subjectId: null,
      nome: 'Maria Silva',
      email: 'maria@casa.org',
      situacao,
      grupos: [],
      ativadoEm: null,
      suspensoEm: null,
      ultimoAcessoEm: null,
      convite: Convite.criar(HASH_ANTIGO, new Date(AGORA.getTime() + 3_600_000), ACESSO.usuarioId, AGORA),
    },
    VERSAO,
  );
}

function montar(usuario: Usuario) {
  const { unidade, enviador, entrega } = montarEntrega();
  const repositorio = new RepositorioQueGuardaAdicionados([usuario]);
  const reenviar = new ReenviarConvite(unidade, repositorio, new GeradorFixo(), entrega, new RelogioFixo());
  return { unidade, enviador, repositorio, reenviar };
}

describe('ReenviarConvite', () => {
  it('gera novo token, troca o convite vigente, salva e devolve só a versão', async () => {
    const usuario = usuarioEm('CONVITE_PENDENTE');
    const { repositorio, reenviar } = montar(usuario);

    const resultado = await reenviar.executar(ACESSO, { usuarioId: ALVO, versaoEsperada: VERSAO });

    expect(ehOk(resultado) && resultado.valor).toEqual({ versao: VERSAO + 1 });
    expect(repositorio.salvos).toEqual([usuario]);
    expect(usuario.convite?.hashDoToken).toBe('1'.padStart(64, 'a'));
    expect(usuario.convite?.expiraEm).toEqual(expiracaoMaximaDoConvite(AGORA));
    expect(usuario.convitesSubstituidos.map(({ hashDoToken }) => hashDoToken)).toEqual([HASH_ANTIGO]);
  });

  it('entrega o novo token em claro só depois da confirmação', async () => {
    const { unidade, enviador, reenviar } = montar(usuarioEm('CONVITE_PENDENTE'));

    await reenviar.executar(ACESSO, { usuarioId: ALVO, versaoEsperada: VERSAO });
    expect(enviador.enviados).toEqual([]);
    unidade.confirmar();

    expect(enviador.enviados).toEqual([
      {
        usuarioId: ALVO,
        email: 'maria@casa.org',
        nome: 'Maria Silva',
        token: `${TOKEN_EM_CLARO}-1`,
        expiraEm: expiracaoMaximaDoConvite(AGORA),
      },
    ]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para id desconhecido', async () => {
    const { reenviar } = montar(usuarioEm('CONVITE_PENDENTE'));

    const resultado = await reenviar.executar(ACESSO, { usuarioId: 'outro' as UsuarioId, versaoEsperada: VERSAO });

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA sem salvar nem enviar', async () => {
    const { unidade, enviador, repositorio, reenviar } = montar(usuarioEm('CONVITE_PENDENTE'));

    const resultado = await reenviar.executar(ACESSO, { usuarioId: ALVO, versaoEsperada: VERSAO - 1 });
    unidade.confirmar();

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(repositorio.salvos).toEqual([]);
    expect(enviador.enviados).toEqual([]);
  });

  it.each([
    ['ATIVO', 'CONVITE_JA_USADO'],
    ['SUSPENSO', 'SITUACAO_DO_USUARIO_NAO_PERMITE'],
    ['REVOGADO', 'SITUACAO_DO_USUARIO_NAO_PERMITE'],
  ] as const)('recusa o alvo %s com %s, sem salvar nem enviar', async (situacao, codigo) => {
    const { unidade, enviador, repositorio, reenviar } = montar(usuarioEm(situacao));

    const resultado = await reenviar.executar(ACESSO, { usuarioId: ALVO, versaoEsperada: VERSAO });
    unidade.confirmar();

    expect(ehErr(resultado) && resultado.erro.codigo).toBe(codigo);
    expect(repositorio.salvos).toEqual([]);
    expect(enviador.enviados).toEqual([]);
  });
});
