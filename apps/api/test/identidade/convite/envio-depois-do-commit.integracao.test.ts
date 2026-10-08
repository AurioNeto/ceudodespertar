import type { InstituicaoId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntregaDeConvite } from '../../../src/modules/identidade/application/convite/entrega-de-convite.js';
import { ConvidarUsuario } from '../../../src/modules/identidade/application/usuarios/convidar-usuario.js';
import { GeradorDeTokenDeConviteNode } from '../../../src/modules/identidade/infrastructure/convite/gerador-de-token-de-convite.node.js';
import { LeitorDeGruposDaInstituicaoKysely } from '../../../src/modules/identidade/infrastructure/usuarios/leitor-de-grupos-da-instituicao.kysely.js';
import { RelogioDoSistema } from '../../../src/shared/infrastructure/relogio.js';
import { comContexto, INSTITUICAO_A, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { abrirAmbienteDaIdentidade, AUTOR, consultarNaInstituicao } from '../apoio.js';
import type { AmbienteDaIdentidade } from '../apoio.js';
import { enviadorQueSondaOBanco } from './apoio-de-convite.js';

const ACESSO = { usuarioId: AUTOR, instituicaoId: INSTITUICAO_A as InstituicaoId };
const PEDIDO = { nome: 'Maria Silva', email: 'maria@casa.org' };

describe('envio do convite depois do commit (Doc 7 §5)', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco);
    await ambiente.semeador.semear(INSTITUICAO_A);
  });

  afterEach(async () => {
    await ambiente.orm.close();
    await derrubarBancoDeTeste(banco);
  });

  function montarConvidar() {
    const enviador = enviadorQueSondaOBanco(banco, INSTITUICAO_A);
    const convidar = new ConvidarUsuario(
      ambiente.unidadeDeTrabalho,
      ambiente.usuarios,
      new LeitorDeGruposDaInstituicaoKysely(ambiente.unidadeDeTrabalho),
      new GeradorDeTokenDeConviteNode(),
      new EntregaDeConvite(enviador),
      new RelogioDoSistema(),
    );
    return { enviador, convidar };
  }

  async function totalDeUsuarios(): Promise<number> {
    const [linha] = await consultarNaInstituicao<{ total: number }>(
      banco,
      INSTITUICAO_A,
      'select count(*)::int as total from identidade.usuario',
    );
    return linha!.total;
  }

  it('transação que desfaz depois do convite não envia nada e não deixa o usuário', async () => {
    const { enviador, convidar } = montarConvidar();

    const tentativa = comContexto(INSTITUICAO_A, () =>
      ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
        await convidar.executar(ACESSO, PEDIDO);
        throw new Error('desfaz a transação inteira');
      }),
    );

    await expect(tentativa).rejects.toThrow('desfaz a transação inteira');
    expect(enviador.enviados).toEqual([]);
    expect(await totalDeUsuarios()).toBe(0);
  });

  it('transação que confirma envia uma vez, com o usuário já visível no banco', async () => {
    const { enviador, convidar } = montarConvidar();

    await comContexto(INSTITUICAO_A, () =>
      ambiente.unidadeDeTrabalho.transacao('escrita', () => convidar.executar(ACESSO, PEDIDO)),
    );

    expect(enviador.enviados).toHaveLength(1);
    expect(await Promise.all(enviador.instantaneosDoBanco)).toEqual([1]);
  });
});
