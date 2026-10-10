import { describe, expect, it } from 'vitest';
import { BootstrapDaIdentidade } from '../../../src/modules/identidade/application/bootstrap/bootstrap-da-identidade.js';
import { PersistenciaDoBootstrap } from '../../../src/modules/identidade/application/bootstrap/persistencia-do-bootstrap.js';
import { SemeadorDeGrupos } from '../../../src/modules/identidade/application/bootstrap/semeador-de-grupos.js';
import { GeradorDeTokenDeConvite } from '../../../src/modules/identidade/application/convite/gerador-de-token-de-convite.js';
import { LeitorDeGruposDaInstituicao } from '../../../src/modules/identidade/application/usuarios/leitor-de-grupos-da-instituicao.js';
import { RepositorioDeUsuario } from '../../../src/modules/identidade/domain/usuario/usuario.repo.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { ehErr } from '../../../src/shared/kernel/result.js';
import {
  COMANDO_POR_VINCULO,
  ConferidorQueResponde,
  EMAIL_DA_ADMINISTRADORA,
  RelogioEmSequencia,
  SUJEITO_DA_ADMINISTRADORA,
} from './apoio-de-bootstrap.js';

class UnidadeDeTrabalhoProibida extends UnidadeDeTrabalho {
  transacao(): never {
    throw new Error('nenhuma transação pode abrir antes da conferência do sujeito');
  }
}

class Proibido {
  constructor() {
    return new Proxy(this, {
      get: () => () => {
        throw new Error('colaborador tocado antes da conferência do sujeito');
      },
    });
  }
}

function montar(conferidor: ConferidorQueResponde): BootstrapDaIdentidade {
  return new BootstrapDaIdentidade(
    new UnidadeDeTrabalhoProibida(),
    new Proibido() as unknown as PersistenciaDoBootstrap,
    new Proibido() as unknown as SemeadorDeGrupos,
    new Proibido() as unknown as LeitorDeGruposDaInstituicao,
    new Proibido() as unknown as RepositorioDeUsuario,
    new Proibido() as unknown as GeradorDeTokenDeConvite,
    conferidor,
    new RelogioEmSequencia([new Date()]),
  );
}

describe('BootstrapDaIdentidade: pré-fase do modo vínculo', () => {
  it.each([
    ['e-mail divergente', 'outra@casa.org', 'EMAIL_DO_SUJEITO_DIVERGENTE'],
    ['sub inexistente', undefined, 'SUJEITO_INEXISTENTE'],
  ])('%s: recusa sem abrir transação nem tocar a persistência', async (_descricao, emailNoProvedor, codigo) => {
    const conferidor = new ConferidorQueResponde();
    conferidor.emails.clear();
    if (emailNoProvedor !== undefined) conferidor.emails.set(SUJEITO_DA_ADMINISTRADORA, emailNoProvedor);

    const resultado = await montar(conferidor).executar(COMANDO_POR_VINCULO);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe(codigo);
    expect(conferidor.consultados).toEqual([SUJEITO_DA_ADMINISTRADORA]);
  });

  it('provedor indisponível: recusa sem abrir transação', async () => {
    const conferidor = new ConferidorQueResponde();
    conferidor.indisponivel = true;

    const resultado = await montar(conferidor).executar(COMANDO_POR_VINCULO);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
  });

  it('erro inesperado do provedor propaga em vez de virar erro de regra', async () => {
    const conferidor = new ConferidorQueResponde();
    conferidor.aoConsultar = () => Promise.reject(new Error('bug no adaptador'));

    await expect(montar(conferidor).executar({ ...COMANDO_POR_VINCULO, adminEmail: EMAIL_DA_ADMINISTRADORA })).rejects.toThrow(
      'bug no adaptador',
    );
  });
});
