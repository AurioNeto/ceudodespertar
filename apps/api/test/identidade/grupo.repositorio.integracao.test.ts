import type { GrupoId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { Grupo } from '../../src/modules/identidade/domain/grupo/grupo.js';
import { abrirAmbienteDaIdentidade, AUTOR, consultarNaInstituicao, eventosDoOutbox, novoGrupo } from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const DEPOIS = new Date('2026-03-02T10:00:00.000Z');

interface LinhaDoGrupo {
  codigo_sistema: string | null;
  nome: string;
  descricao: string;
  protegido: boolean;
  ativo: boolean;
  versao: number;
}

describe('RepositorioDeGrupoMikroOrm', () => {
  let banco: BancoDeTeste;
  let ambiente: AmbienteDaIdentidade;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    ambiente = await abrirAmbienteDaIdentidade(banco);
  });

  afterEach(async () => {
    await ambiente.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function naInstituicaoA<T>(fn: () => Promise<T>): Promise<T> {
    return comContexto(INSTITUICAO_A, fn);
  }

  async function carregar(id: GrupoId): Promise<Grupo> {
    const grupo = await naInstituicaoA(() => ambiente.grupos.porId(id));
    if (grupo === undefined) throw new Error('grupo não encontrado');
    return grupo;
  }

  function linhaDoGrupo(id: GrupoId): Promise<LinhaDoGrupo | undefined> {
    return consultarNaInstituicao<LinhaDoGrupo>(
      banco,
      INSTITUICAO_A,
      'select codigo_sistema, nome, descricao, protegido, ativo, versao from identidade.grupo where id = $1',
      [id],
    ).then(([linha]) => linha);
  }

  async function permissoesGravadas(id: GrupoId): Promise<string[]> {
    const linhas = await consultarNaInstituicao<{ permissao: string }>(
      banco,
      INSTITUICAO_A,
      'select permissao from identidade.grupo_permissao where grupo_id = $1 order by permissao',
      [id],
    );
    return linhas.map((linha) => linha.permissao);
  }

  it('adiciona o grupo e o reconstitui idêntico, com permissões, ativo e versão', async () => {
    const grupo = novoGrupo(['financeiro.lancamento.ler', 'financeiro.conta.ler']);

    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    const recarregado = await carregar(grupo.id);

    expect(recarregado).toMatchObject({
      id: grupo.id,
      codigoSistema: null,
      nome: grupo.nome,
      descricao: grupo.descricao,
      protegido: false,
      ativo: true,
      versao: 1,
    });
    expect(recarregado.permissoes).toEqual(['financeiro.conta.ler', 'financeiro.lancamento.ler']);
    expect(recarregado.retirarEventos()).toEqual([]);
  });

  it('grupo de sistema guarda código e proteção', async () => {
    const criado = Grupo.criar({
      id: gerarUuidV7() as GrupoId,
      codigoSistema: 'LEITURA',
      nome: 'Leitura',
      descricao: 'Só consulta',
      protegido: true,
      permissoes: [],
    });
    if (criado.tipo === 'erro') throw new Error(criado.erro.codigo);

    await naInstituicaoA(() => ambiente.grupos.adicionar(criado.valor));

    expect(await linhaDoGrupo(criado.valor.id)).toMatchObject({ codigo_sistema: 'LEITURA', protegido: true });
    expect(await carregar(criado.valor.id)).toMatchObject({ codigoSistema: 'LEITURA', protegido: true });
  });

  it('conceder e revogar permissão grava a diferença, sobe a versão e emite os eventos no outbox', async () => {
    const grupo = novoGrupo(['financeiro.lancamento.ler', 'financeiro.conta.ler']);
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));

    const lido = await carregar(grupo.id);
    lido.concederPermissao('financeiro.dre.ler', AUTOR, DEPOIS);
    lido.revogarPermissao('financeiro.conta.ler', AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.grupos.salvar(lido));

    expect(await permissoesGravadas(grupo.id)).toEqual(['financeiro.dre.ler', 'financeiro.lancamento.ler']);
    expect(await linhaDoGrupo(grupo.id)).toMatchObject({ versao: 2 });
    expect(await eventosDoOutbox(banco, grupo.id)).toEqual(['GRUPO_EDITADO', 'GRUPO_EDITADO']);
  });

  it('renomear grava nome e descrição', async () => {
    const grupo = novoGrupo();
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));

    const lido = await carregar(grupo.id);
    lido.renomear('Novo nome', 'Nova descrição', AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.grupos.salvar(lido));

    expect(await linhaDoGrupo(grupo.id)).toMatchObject({ nome: 'Novo nome', descricao: 'Nova descrição', versao: 2 });
    expect(await eventosDoOutbox(banco, grupo.id)).toEqual(['GRUPO_EDITADO']);
  });

  it('excluir marca o grupo inativo sem apagar a linha', async () => {
    const grupo = novoGrupo();
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));

    const lido = await carregar(grupo.id);
    lido.excluir(0, AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.grupos.salvar(lido));

    expect(await linhaDoGrupo(grupo.id)).toMatchObject({ ativo: false, versao: 2 });
    expect((await carregar(grupo.id)).ativo).toBe(false);
  });

  it('porId devolve undefined para id inexistente', async () => {
    expect(await naInstituicaoA(() => ambiente.grupos.porId(gerarUuidV7() as GrupoId))).toBeUndefined();
  });
});
