import { describe, expect, it } from 'vitest';
import { GRUPOS_DE_SISTEMA } from '../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';
import { PermissoesEfetivas } from '../../src/modules/identidade/domain/permissao/permissoes-efetivas.js';
import { CATALOGO_DO_DOC_3_SECAO_11 } from './catalogo-do-doc-3-secao-11.js';
import type { CasoDoDoc3, CamadaDePermissao } from './catalogo-do-doc-3-secao-11.js';

interface CasoComCamada extends CamadaDePermissao {
  readonly id: string;
}

const CASOS_COM_CAMADA: readonly CasoComCamada[] = CATALOGO_DO_DOC_3_SECAO_11.flatMap(({ id, camadaDePermissao }: CasoDoDoc3) =>
  camadaDePermissao === undefined ? [] : [{ id, grupo: camadaDePermissao.grupo, permissoes: camadaDePermissao.permissoes, resultado: camadaDePermissao.resultado }],
);

function permissoesDoGrupoDeSistema(codigo: CamadaDePermissao['grupo']): ReadonlySet<string> {
  const grupo = GRUPOS_DE_SISTEMA.find((candidato) => candidato.codigoSistema === codigo);
  if (grupo === undefined) throw new Error(`grupo de sistema ausente do seed: ${codigo}`);
  return new Set(PermissoesEfetivas.dosGrupos([{ ativo: true, permissoes: grupo.permissoes }]).lista);
}

describe('Doc 3 §11 · camada de permissão dos casos bloqueados, com o seed real dos grupos de sistema', () => {
  it('catálogo — casos com camada de permissão — são os 22 que já têm lado de permissão', () => {
    expect(CASOS_COM_CAMADA.map(({ id }) => id)).toEqual([
      'T1', 'T2', 'T3', 'T4', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15',
      'T16', 'T16a', 'T16b', 'T17', 'T18', 'T21', 'T22', 'T27',
    ]);
  });

  it.each(CASOS_COM_CAMADA.filter(({ resultado }) => resultado === 'concedida'))(
    '$id · grupo $grupo — permissões $permissoes — concedidas pelo seed',
    ({ grupo, permissoes }) => {
      const efetivas = permissoesDoGrupoDeSistema(grupo);

      expect(permissoes.filter((permissao) => !efetivas.has(permissao))).toEqual([]);
    },
  );

  it.each(CASOS_COM_CAMADA.filter(({ resultado }) => resultado === 'negada'))(
    '$id · grupo $grupo — permissões $permissoes — negadas pelo seed',
    ({ grupo, permissoes }) => {
      const efetivas = permissoesDoGrupoDeSistema(grupo);

      expect(permissoes.filter((permissao) => efetivas.has(permissao))).toEqual([]);
    },
  );

  it('grupo sem a permissão — verificação de concessão — não confunde com grupo que a tem', () => {
    const doAcolhimento = permissoesDoGrupoDeSistema('ACOLHIMENTO');
    const daTesouraria = permissoesDoGrupoDeSistema('TESOURARIA');

    expect([doAcolhimento.has('financeiro.lancamento.estornar'), daTesouraria.has('financeiro.lancamento.estornar')]).toEqual([false, true]);
  });
});

describe('Doc 3 §11 · casos bloqueados por etapa futura', () => {
  it.todo('T1 · Acolhimento consulta o painel de arrecadação do evento — bloqueada até a B5');
  it.todo('T2 · Acolhimento consulta resultado/ponto de equilíbrio do evento — bloqueada até a B5');
  it.todo('T3 · Acolhimento lista lançamentos do evento — bloqueada até a B5');
  it.todo('T4 · Acolhimento marca pagamento de inscrição — bloqueada até a B5');
  it.todo('T5 · Acolhimento tenta editar o lançamento gerado em T4 — bloqueada até a B5');
  it.todo('T6 · Acolhimento tenta estornar o lançamento gerado em T4 — bloqueada até a B5');
  it.todo('T7 · Acolhimento registra solicitação de devolução — bloqueada até a B5');
  it.todo('T8 · Acolhimento tenta efetivar devolução — bloqueada até a B5');
  it.todo('T9 · Acolhimento consulta DRE — bloqueada até a B1');
  it.todo('T10 · Acolhimento cria evento e inscreve pessoa — bloqueada até a B5');
  it.todo('T11 · Acolhimento lê anamnese — bloqueada até a B4');
  it.todo('T12 · Acolhimento gerencia contratação da Munay — bloqueada até a B5');
  it.todo('T13 · `REGISTRO` cria lançamento `A_CONFERIR` — bloqueada até a B1');
  it.todo('T14 · `REGISTRO` tenta confirmar o próprio lançamento — bloqueada até a B1');
  it.todo('T15 · `REGISTRO` consulta o DRE — bloqueada até a B1');
  it.todo('T16 · Tesouraria confirma lançamento criado por `REGISTRO` — bloqueada até a B1');
  it.todo('T16a · `REGISTRO` lista os lançamentos que ele mesmo registrou — bloqueada até a B1');
  it.todo('T16b · `REGISTRO` tenta ler lançamento registrado por outro usuário — bloqueada até a B1');
  it.todo('T16c · `REGISTRO` responde pendência aberta no próprio lançamento — bloqueada até a B1');
  it.todo('T16d · Tesouraria tenta responder pendência endereçada ao `REGISTRO` — bloqueada até a B1');
  it.todo('T16e · Resposta a pendência altera o `status` do lançamento — bloqueada até a B1');
  it.todo('T17 · Administrador **sem** vínculo de padrinho autoriza adiantamento — bloqueada até a B2');
  it.todo('T18 · Padrinho (grupo `GOVERNANCA`) autoriza adiantamento — bloqueada até a B2');
  it.todo('T19 · Padrinho com vínculo **encerrado** na data da despesa autoriza — bloqueada até a B2');
  it.todo('T20 · Estimativa de consumo altera saldo de estoque — bloqueada até a B6');
  it.todo('T21 · Tesouraria tenta ler anamnese — bloqueada até a B4');
  it.todo('T22 · Governança tenta ler anamnese — bloqueada até a B4');
  it.todo('T27 · `LEITURA` consulta lista nominal de participantes — bloqueada até a B5');
  it.todo('T26 · Keycloak · usuário desativado no provedor não obtém token — lacuna da B0');
});
