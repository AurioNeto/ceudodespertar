import type { GrupoId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { GRUPOS_DE_SISTEMA } from '../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';
import { abrirAmbienteDaIdentidade, AUTOR, consultarNaInstituicao } from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';
import { permissoesDaMatrizPara } from './matriz-do-doc-3-secao-6.js';

const QUANTIDADE_DE_GRUPOS_DE_SISTEMA = 6;
const DEPOIS = new Date('2026-03-02T10:00:00.000Z');

interface LinhaDoGrupo {
  id: string;
  codigo_sistema: string;
  nome: string;
  descricao: string;
  protegido: boolean;
  ativo: boolean;
  versao: number;
}

interface LinhaDePermissao {
  codigo_sistema: string;
  permissao: string;
}

describe('SemeadorDeGruposDeSistema', () => {
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

  function gruposDe(instituicaoId: string): Promise<LinhaDoGrupo[]> {
    return consultarNaInstituicao<LinhaDoGrupo>(
      banco,
      instituicaoId,
      'select id, codigo_sistema, nome, descricao, protegido, ativo, versao from identidade.grupo order by codigo_sistema',
    );
  }

  function permissoesDe(instituicaoId: string): Promise<LinhaDePermissao[]> {
    return consultarNaInstituicao<LinhaDePermissao>(
      banco,
      instituicaoId,
      `select g.codigo_sistema, gp.permissao
         from identidade.grupo_permissao gp
         join identidade.grupo g on g.id = gp.grupo_id
        order by g.codigo_sistema, gp.permissao`,
    );
  }

  function permissoesPorCodigo(linhas: readonly LinhaDePermissao[]): Map<string, string[]> {
    const porCodigo = new Map<string, string[]>();
    for (const { codigo_sistema: codigo, permissao } of linhas) {
      porCodigo.set(codigo, [...(porCodigo.get(codigo) ?? []), permissao]);
    }
    return porCodigo;
  }

  it('cria os seis grupos de sistema protegidos, ativos e na versão 1', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    const grupos = await gruposDe(INSTITUICAO_A);
    expect(grupos.map((grupo) => grupo.codigo_sistema)).toEqual(
      GRUPOS_DE_SISTEMA.map((grupo) => grupo.codigoSistema).toSorted(),
    );
    for (const grupo of grupos) {
      const esperado = GRUPOS_DE_SISTEMA.find((candidato) => candidato.codigoSistema === grupo.codigo_sistema)!;
      expect(grupo).toMatchObject({
        nome: esperado.nome,
        descricao: esperado.descricao,
        protegido: true,
        ativo: true,
        versao: 1,
      });
    }
  });

  it('cada grupo nasce com as permissões do seed', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    const porCodigo = permissoesPorCodigo(await permissoesDe(INSTITUICAO_A));
    for (const grupo of GRUPOS_DE_SISTEMA) {
      expect(porCodigo.get(grupo.codigoSistema)).toEqual([...grupo.permissoes].toSorted());
    }
  });

  it('T29(e) · o que o seed grava é a matriz do Doc 3 §6', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    const porCodigo = permissoesPorCodigo(await permissoesDe(INSTITUICAO_A));
    for (const codigo of GRUPOS_DE_SISTEMA.map((grupo) => grupo.codigoSistema)) {
      expect(porCodigo.get(codigo), codigo).toEqual(permissoesDaMatrizPara(codigo));
    }
  });

  it('a segunda execução não muda nada: mesmos ids, mesmas linhas, mesma versão', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    const gruposAntes = await gruposDe(INSTITUICAO_A);
    const permissoesAntes = await permissoesDe(INSTITUICAO_A);

    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await gruposDe(INSTITUICAO_A)).toEqual(gruposAntes);
    expect(await permissoesDe(INSTITUICAO_A)).toEqual(permissoesAntes);
  });

  it('não reverte edição posterior de grupo protegido: nome, descrição e permissões', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    const leitura = (await gruposDe(INSTITUICAO_A)).find((grupo) => grupo.codigo_sistema === 'LEITURA');
    const grupo = (await comContexto(INSTITUICAO_A, () => ambiente.grupos.porId(leitura!.id as GrupoId)))!;
    grupo.renomear('Consulta', 'Só olha', AUTOR, DEPOIS);
    grupo.concederPermissao('financeiro.conta.ler', AUTOR, DEPOIS);
    grupo.revogarPermissao('estoque.saldo.ler', AUTOR, DEPOIS);
    await comContexto(INSTITUICAO_A, () => ambiente.grupos.salvar(grupo));
    const gruposAntes = await gruposDe(INSTITUICAO_A);
    const permissoesAntes = await permissoesDe(INSTITUICAO_A);

    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await gruposDe(INSTITUICAO_A)).toEqual(gruposAntes);
    expect(await permissoesDe(INSTITUICAO_A)).toEqual(permissoesAntes);
    const depois = (await gruposDe(INSTITUICAO_A)).find((candidato) => candidato.codigo_sistema === 'LEITURA');
    expect(depois).toMatchObject({ nome: 'Consulta', descricao: 'Só olha', versao: 2 });
    const permissoesDaLeitura = permissoesPorCodigo(await permissoesDe(INSTITUICAO_A)).get('LEITURA');
    expect(permissoesDaLeitura).toContain('financeiro.conta.ler');
    expect(permissoesDaLeitura).not.toContain('estoque.saldo.ler');
  });

  it('cada instituição recebe os seus seis grupos, com ids próprios', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);
    await ambiente.semeador.semear(INSTITUICAO_B);

    const gruposA = await gruposDe(INSTITUICAO_A);
    const gruposB = await gruposDe(INSTITUICAO_B);
    expect(gruposA).toHaveLength(QUANTIDADE_DE_GRUPOS_DE_SISTEMA);
    expect(gruposB).toHaveLength(QUANTIDADE_DE_GRUPOS_DE_SISTEMA);
    expect(new Set([...gruposA, ...gruposB].map((grupo) => grupo.id)).size).toBe(2 * QUANTIDADE_DE_GRUPOS_DE_SISTEMA);
  });

  it('semear só uma instituição não toca a outra', async () => {
    await ambiente.semeador.semear(INSTITUICAO_A);

    expect(await gruposDe(INSTITUICAO_B)).toEqual([]);
  });

  it('duas execuções simultâneas na mesma instituição terminam com um único conjunto de grupos', async () => {
    await Promise.all([ambiente.semeador.semear(INSTITUICAO_A), ambiente.semeador.semear(INSTITUICAO_A)]);

    expect(await gruposDe(INSTITUICAO_A)).toHaveLength(QUANTIDADE_DE_GRUPOS_DE_SISTEMA);
    const porCodigo = permissoesPorCodigo(await permissoesDe(INSTITUICAO_A));
    for (const grupo of GRUPOS_DE_SISTEMA) {
      expect(porCodigo.get(grupo.codigoSistema)).toEqual([...grupo.permissoes].toSorted());
    }
  });
});
