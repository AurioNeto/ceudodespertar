import { describe, expect, it } from 'vitest';
import { ConvidarUsuario } from '../../../src/modules/identidade/application/usuarios/convidar-usuario.js';
import { expiracaoMaximaDoConvite } from '../../../src/modules/identidade/domain/usuario/convite.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { ACESSO, AGORA, RelogioFixo } from '../gestao-de-usuarios/dubles.js';
import {
  GeradorFixo,
  GRUPO_DE_TESTE,
  GRUPO_PADRAO,
  LeitorDeGruposFalso,
  montarEntrega,
  RepositorioQueGuardaAdicionados,
  TOKEN_EM_CLARO,
} from './dubles-de-convite.js';

const PEDIDO = { nome: 'Maria Silva', email: 'maria@casa.org' };

function montar(grupos = new LeitorDeGruposFalso([GRUPO_DE_TESTE], GRUPO_PADRAO)) {
  const { unidade, enviador, entrega } = montarEntrega();
  const repositorio = new RepositorioQueGuardaAdicionados();
  const convidar = new ConvidarUsuario(unidade, repositorio, grupos, new GeradorFixo(), entrega, new RelogioFixo());
  return { unidade, enviador, repositorio, convidar };
}

describe('ConvidarUsuario', () => {
  it('sem grupos, convida para o grupo de sistema LEITURA e devolve o usuário com a versão inicial', async () => {
    const { repositorio, convidar } = montar();

    const resultado = await convidar.executar(ACESSO, PEDIDO);

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: repositorio.adicionados[0]!.id,
      nome: 'Maria Silva',
      email: 'maria@casa.org',
      situacao: 'CONVITE_PENDENTE',
      grupos: [GRUPO_PADRAO],
      versao: 1,
    });
    expect(repositorio.adicionados[0]!.grupos).toEqual([GRUPO_PADRAO.id]);
  });

  it('lista de grupos vazia também cai no grupo LEITURA', async () => {
    const { repositorio, convidar } = montar();

    await convidar.executar(ACESSO, { ...PEDIDO, grupos: [] });

    expect(repositorio.adicionados[0]!.grupos).toEqual([GRUPO_PADRAO.id]);
  });

  it('usa os grupos pedidos quando todos são ativos da instituição', async () => {
    const { repositorio, convidar } = montar();

    const resultado = await convidar.executar(ACESSO, { ...PEDIDO, grupos: [GRUPO_DE_TESTE.id] });

    expect(ehOk(resultado) && resultado.valor.grupos).toEqual([GRUPO_DE_TESTE]);
    expect(repositorio.adicionados[0]!.grupos).toEqual([GRUPO_DE_TESTE.id]);
  });

  it('recusa grupo que não é ativo da instituição com GRUPO_INEXISTENTE, sem adicionar nem enviar', async () => {
    const { unidade, enviador, repositorio, convidar } = montar();

    const resultado = await convidar.executar(ACESSO, { ...PEDIDO, grupos: [GRUPO_DE_TESTE.id, 'b1000000-0000-7000-8000-0000000000ff' as typeof GRUPO_PADRAO.id] });
    unidade.confirmar();

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'GRUPO_INEXISTENTE',
      detalhes: { grupos: ['b1000000-0000-7000-8000-0000000000ff'] },
    });
    expect(repositorio.adicionados).toEqual([]);
    expect(enviador.enviados).toEqual([]);
  });

  it('recusa com GRUPO_INEXISTENTE quando a instituição não tem o grupo LEITURA', async () => {
    const { convidar } = montar(new LeitorDeGruposFalso([]));

    const resultado = await convidar.executar(ACESSO, PEDIDO);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('GRUPO_INEXISTENTE');
  });

  it('guarda só o hash do token e expira o convite no limite de validade', async () => {
    const { repositorio, convidar } = montar();

    await convidar.executar(ACESSO, PEDIDO);

    const convite = repositorio.adicionados[0]!.convite!;
    expect(convite.hashDoToken).toBe('1'.padStart(64, 'a'));
    expect(convite.expiraEm).toEqual(expiracaoMaximaDoConvite(AGORA));
    expect(JSON.stringify(repositorio.adicionados[0]!.retirarEventos())).not.toContain(TOKEN_EM_CLARO);
  });

  it('entrega o token em claro ao enviador só depois da confirmação', async () => {
    const { unidade, enviador, repositorio, convidar } = montar();

    await convidar.executar(ACESSO, PEDIDO);
    expect(enviador.enviados).toEqual([]);
    unidade.confirmar();

    expect(enviador.enviados).toEqual([
      {
        usuarioId: repositorio.adicionados[0]!.id,
        email: 'maria@casa.org',
        nome: 'Maria Silva',
        token: `${TOKEN_EM_CLARO}-1`,
        expiraEm: expiracaoMaximaDoConvite(AGORA),
      },
    ]);
  });

  it('abre uma transação de escrita', async () => {
    const { unidade, convidar } = montar();

    await convidar.executar(ACESSO, PEDIDO);

    expect(unidade.modos).toEqual(['escrita']);
  });
});
