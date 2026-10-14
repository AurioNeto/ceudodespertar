import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import { comContexto, INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import type { ContextoDaTransacao } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { RelogioDoSistema } from '../../src/shared/infrastructure/relogio.js';
import { ConsultarAuditoria } from '../../src/modules/identidade/application/auditoria/consultar-auditoria.js';
import type { EntradaDeAuditoria } from '../../src/modules/identidade/application/auditoria/entrada-de-auditoria.js';
import { TrilhaDeAuditoria } from '../../src/modules/identidade/application/auditoria/trilha-de-auditoria.js';
import { LeitorDeAuditoriaKysely } from '../../src/modules/identidade/infrastructure/auditoria/leitor-de-auditoria.kysely.js';

const USUARIO = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;
const ACESSO = { usuarioId: USUARIO, instituicaoId: INSTITUICAO_A as InstituicaoId };

const NO_MESMO_MILISSEGUNDO = [
  { id: '0195c3a0-0000-7000-8000-000000000001', em: '2026-03-05T10:00:00.123900Z' },
  { id: '0195c3a0-0000-7000-8000-000000000002', em: '2026-03-05T10:00:00.123600Z' },
  { id: '0195c3a0-0000-7000-8000-000000000003', em: '2026-03-05T10:00:00.123300Z' },
  { id: '0195c3a0-0000-7000-8000-000000000004', em: '2026-03-05T10:00:00.122000Z' },
];

class TrilhaQueNaoGrava extends TrilhaDeAuditoria {
  gravar(_contexto: ContextoDaTransacao, _entradas: readonly EntradaDeAuditoria[]): Promise<void> {
    return Promise.resolve();
  }
}

describe('paginação da trilha de auditoria com instantes em microssegundos (now() do banco)', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let consultar: ConsultarAuditoria;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    orm = await abrirOrmDeTeste(banco, 3);
    consultar = new ConsultarAuditoria(
      new UnidadeDeTrabalhoMikroOrm(orm),
      new TrilhaQueNaoGrava(),
      new LeitorDeAuditoriaKysely(),
      new RelogioDoSistema(),
    );
    await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [INSTITUICAO_A]);
    for (const { id, em } of NO_MESMO_MILISSEGUNDO) {
      // eslint-disable-next-line no-await-in-loop -- inserção em sequência, como gravaria um ato por vez
      await banco.owner.query(
        `insert into identidade.registro_de_auditoria
           (id, instituicao_id, em, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
         values ($1, $2, $3::timestamptz, 'SISTEMA', '{}', 'USUARIO_CONVIDADO', 'Auditoria', $2)`,
        [id, INSTITUICAO_A, em],
      );
    }
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  async function todasAsPaginas(limite: number, depois?: string, lidos: string[] = []): Promise<string[]> {
    const pagina = await comContexto(INSTITUICAO_A, () =>
      consultar.executar(ACESSO, { limite, ...(depois === undefined ? {} : { depois }) }),
    );
    const acumulados = [...lidos, ...pagina.itens.map(({ id }) => id)];
    return pagina.proxima === null ? acumulados : todasAsPaginas(limite, pagina.proxima, acumulados);
  }

  it.each([1, 2, 3])('páginas de %i percorrem todas as linhas, uma vez cada, na ordem da trilha', async (limite) => {
    expect(await todasAsPaginas(limite)).toStrictEqual(NO_MESMO_MILISSEGUNDO.map(({ id }) => id));
  });
});
