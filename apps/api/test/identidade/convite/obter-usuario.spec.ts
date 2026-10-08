import type { DataHora, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { LeitorDeUsuarios } from '../../../src/modules/identidade/application/usuarios/leitor-de-usuarios.js';
import type {
  ConsultaDeUsuarios,
  UsuarioComPosicao,
} from '../../../src/modules/identidade/application/usuarios/leitor-de-usuarios.js';
import { ObterUsuario } from '../../../src/modules/identidade/application/usuarios/obter-usuario.js';

const ID = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;

class LeitorQueRegistra extends LeitorDeUsuarios {
  consultas: ConsultaDeUsuarios[] = [];

  constructor(private readonly lidos: readonly UsuarioComPosicao[]) {
    super();
  }

  ler(consulta: ConsultaDeUsuarios): Promise<UsuarioComPosicao[]> {
    this.consultas.push(consulta);
    return Promise.resolve([...this.lidos]);
  }
}

const LIDO: UsuarioComPosicao = {
  usuario: {
    id: ID,
    nome: 'Ana',
    email: 'ana@casa.org',
    situacao: 'ATIVO',
    grupos: [],
    versao: 3,
    ultimoAcessoEm: null as DataHora | null,
  },
  posicao: { chaveDeNome: 'ana', id: ID },
};

describe('ObterUsuario', () => {
  it('pede ao leitor só o usuário do id e devolve o item', async () => {
    const leitor = new LeitorQueRegistra([LIDO]);

    const resultado = await new ObterUsuario(leitor).executar(ID);

    expect(leitor.consultas).toEqual([{ usuarioId: ID, depois: null, limite: 1 }]);
    expect(resultado).toEqual({ tipo: 'ok', valor: LIDO.usuario });
  });

  it('sem linha devolve RECURSO_NAO_ENCONTRADO', async () => {
    const resultado = await new ObterUsuario(new LeitorQueRegistra([])).executar(ID);

    expect(resultado).toMatchObject({
      tipo: 'erro',
      erro: { codigo: 'RECURSO_NAO_ENCONTRADO' },
    });
  });
});
