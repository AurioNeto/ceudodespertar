import { describe, expect, it } from 'vitest';
import { ConcederPermissaoAoGrupo } from '../../../src/modules/identidade/application/grupos/conceder-permissao-ao-grupo.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { ACESSO, GRUPO_LEITURA, RelogioFixo, UnidadeDeTrabalhoFalsa } from '../gestao-de-usuarios/dubles.js';
import { grupoEm, RepositorioDeGrupoEmMemoria, VERSAO_DO_GRUPO } from './dubles.js';

function montar(grupos = [grupoEm(GRUPO_LEITURA, ['financeiro.lancamento.ler'])]) {
  const repositorio = new RepositorioDeGrupoEmMemoria(grupos);
  const unidade = new UnidadeDeTrabalhoFalsa();
  return { repositorio, unidade, conceder: new ConcederPermissaoAoGrupo(unidade, repositorio, new RelogioFixo()) };
}

const comando = (sobrescritas = {}) => ({
  grupoId: GRUPO_LEITURA,
  versaoEsperada: VERSAO_DO_GRUPO,
  permissao: 'pessoas.pessoa.ler',
  ...sobrescritas,
});

describe('ConcederPermissaoAoGrupo', () => {
  it('concede, salva e devolve as permissões com a nova versão, dentro de uma transação de escrita', async () => {
    const { repositorio, unidade, conceder } = montar();

    const resultado = await conceder.executar(ACESSO, comando());

    expect(ehOk(resultado) && resultado.valor).toEqual({
      permissoes: ['financeiro.lancamento.ler', 'pessoas.pessoa.ler'],
      versao: VERSAO_DO_GRUPO + 1,
    });
    expect(repositorio.salvos).toHaveLength(1);
    expect(unidade.modos).toEqual(['escrita']);
  });

  it('conceder permissão já concedida não salva e mantém a versão', async () => {
    const { repositorio, conceder } = montar();

    const resultado = await conceder.executar(ACESSO, comando({ permissao: 'financeiro.lancamento.ler' }));

    expect(ehOk(resultado) && resultado.valor.versao).toBe(VERSAO_DO_GRUPO);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para grupo desconhecido', async () => {
    const { repositorio, conceder } = montar([]);

    const resultado = await conceder.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve VERSAO_DESATUALIZADA sem mutar quando a versão diverge', async () => {
    const grupo = grupoEm(GRUPO_LEITURA, []);
    const { repositorio, conceder } = montar([grupo]);

    const resultado = await conceder.executar(ACESSO, comando({ versaoEsperada: VERSAO_DO_GRUPO - 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(grupo.permissoes).toEqual([]);
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve PERMISSAO_INEXISTENTE para código fora do catálogo', async () => {
    const { repositorio, conceder } = montar();

    const resultado = await conceder.executar(ACESSO, comando({ permissao: 'inventada.coisa.fazer' }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('PERMISSAO_INEXISTENTE');
    expect(repositorio.salvos).toEqual([]);
  });

  it('devolve GRUPO_INEXISTENTE para grupo inativo', async () => {
    const { conceder } = montar([grupoEm(GRUPO_LEITURA, [], false)]);

    const resultado = await conceder.executar(ACESSO, comando());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('GRUPO_INEXISTENTE');
  });
});
