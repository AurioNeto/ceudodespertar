import { describe, expect, it } from 'vitest';
import { RenomearGrupo } from '../../../src/modules/identidade/application/grupos/renomear-grupo.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { ACESSO, GRUPO_LEITURA, RelogioFixo, UnidadeDeTrabalhoFalsa } from '../gestao-de-usuarios/dubles.js';
import { grupoEm, RepositorioDeGrupoEmMemoria, VERSAO_DO_GRUPO } from './dubles.js';

function montar(grupos = [grupoEm(GRUPO_LEITURA, ['financeiro.lancamento.ler'])]) {
  const repositorio = new RepositorioDeGrupoEmMemoria(grupos);
  const unidade = new UnidadeDeTrabalhoFalsa();
  return { repositorio, unidade, renomear: new RenomearGrupo(unidade, repositorio, new RelogioFixo()) };
}

const comando = (sobrescritas = {}) => ({
  grupoId: GRUPO_LEITURA,
  versaoEsperada: VERSAO_DO_GRUPO,
  nome: 'Novo nome',
  descricao: 'Nova descrição',
  ...sobrescritas,
});

describe('RenomearGrupo', () => {
  it('renomeia, salva e devolve o grupo com a nova versão', async () => {
    const { repositorio, unidade, renomear } = montar();

    const resultado = await renomear.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: GRUPO_LEITURA,
      codigoSistema: null,
      nome: 'Novo nome',
      descricao: 'Nova descrição',
      permissoes: ['financeiro.lancamento.ler'],
      protegido: false,
      versao: VERSAO_DO_GRUPO + 1,
    });
    expect(repositorio.salvos).toHaveLength(1);
    expect(unidade.modos).toEqual(['escrita']);
  });

  it('nome e descrição iguais não salvam e mantêm a versão', async () => {
    const { repositorio, renomear } = montar();

    const resultado = await renomear.executar(ACESSO, comando({ nome: 'Grupo de teste', descricao: 'Descrição de teste' }));

    expect(ehOk(resultado) && resultado.valor.versao).toBe(VERSAO_DO_GRUPO);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para grupo desconhecido', async () => {
    const { renomear } = montar([]);

    const resultado = await renomear.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA sem mutar quando a versão diverge', async () => {
    const grupo = grupoEm(GRUPO_LEITURA, []);
    const { repositorio, renomear } = montar([grupo]);

    const resultado = await renomear.executar(ACESSO, comando({ versaoEsperada: VERSAO_DO_GRUPO + 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(grupo.nome).toBe('Grupo de teste');
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve GRUPO_INEXISTENTE para grupo inativo', async () => {
    const { renomear } = montar([grupoEm(GRUPO_LEITURA, [], false)]);

    const resultado = await renomear.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('GRUPO_INEXISTENTE');
  });
});
