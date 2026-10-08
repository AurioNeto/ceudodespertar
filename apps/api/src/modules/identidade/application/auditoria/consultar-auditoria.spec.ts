import type { InstituicaoId, RegistroAuditoriaId, RegistroDeAuditoria, UsuarioId } from '@cdd/contracts';
import { dataHora } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import type { ContextoDaTransacao, ModoDeTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import { ConsultarAuditoria } from './consultar-auditoria.js';
import { codificarCursor } from './cursor-de-auditoria.js';
import type { EntradaDeAuditoria } from './entrada-de-auditoria.js';
import { LeitorDeAuditoria } from './leitor-de-auditoria.js';
import type { ConsultaDaTrilha } from './leitor-de-auditoria.js';
import { ROTULOS_DE_AUDITORIA } from './rotulos-de-auditoria.js';
import { TrilhaDeAuditoria } from './trilha-de-auditoria.js';

const USUARIO = 'a1000000-0000-7000-8000-000000000001' as UsuarioId;
const INSTITUICAO = 'a0000000-0000-7000-8000-000000000000' as InstituicaoId;
const AGORA = new Date('2026-03-05T10:00:00.000Z');
const ACESSO = { usuarioId: USUARIO, instituicaoId: INSTITUICAO };
const LIMITE = 2;

class RelogioFixo extends Relogio {
  agora(): Date {
    return AGORA;
  }
}

class Diario {
  readonly passos: string[] = [];
  readonly modos: ModoDeTransacao[] = [];
}

class UnidadeDeTrabalhoFalsa extends UnidadeDeTrabalho {
  constructor(private readonly diario: Diario) {
    super();
  }

  transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.diario.modos.push(modo);
    return fn({} as ContextoDaTransacao);
  }
}

class TrilhaFalsa extends TrilhaDeAuditoria {
  readonly gravadas: EntradaDeAuditoria[] = [];

  constructor(private readonly diario: Diario) {
    super();
  }

  gravar(_contexto: ContextoDaTransacao, entradas: readonly EntradaDeAuditoria[]): Promise<void> {
    this.diario.passos.push('gravou');
    this.gravadas.push(...entradas);
    return Promise.resolve();
  }
}

class LeitorFalso extends LeitorDeAuditoria {
  readonly consultas: ConsultaDaTrilha[] = [];

  constructor(
    private readonly diario: Diario,
    private readonly registros: readonly RegistroDeAuditoria[],
  ) {
    super();
  }

  ler(_contexto: ContextoDaTransacao, consulta: ConsultaDaTrilha): Promise<RegistroDeAuditoria[]> {
    this.diario.passos.push('leu');
    this.consultas.push(consulta);
    return Promise.resolve([...this.registros]);
  }
}

function registro(n: number): RegistroDeAuditoria {
  const minuto = String(60 - n).padStart(2, '0');
  return {
    id: `0195c3a0-0000-7000-8000-00000000000${n}` as RegistroAuditoriaId,
    em: dataHora(`2026-03-05T09:${minuto}:00.000Z`),
    autorTipo: 'SISTEMA',
    autorNome: 'Sistema',
    autorGrupo: 'Automação',
    operacao: 'USUARIO_CONVIDADO',
    alvo: 'Alguém',
    referencia: null,
    detalhes: [],
    sensivel: false,
  };
}

function montar(registros: readonly RegistroDeAuditoria[] = []) {
  const diario = new Diario();
  const trilha = new TrilhaFalsa(diario);
  const leitor = new LeitorFalso(diario, registros);
  const consultar = new ConsultarAuditoria(new UnidadeDeTrabalhoFalsa(diario), trilha, leitor, new RelogioFixo());
  return { consultar, diario, trilha, leitor };
}

describe('ConsultarAuditoria', () => {
  it('abre transação que grava, registra a consulta e só depois lê', async () => {
    const { consultar, diario } = montar();

    await consultar.executar(ACESSO, { limite: LIMITE });

    expect(diario.modos).toEqual(['leitura-que-grava']);
    expect(diario.passos).toEqual(['gravou', 'leu']);
  });

  it('registra AUDITORIA_CONSULTADA do usuário sobre a instituição, como sensível, sem filtro', async () => {
    const { consultar, trilha } = montar();

    await consultar.executar(ACESSO, { limite: LIMITE });

    expect(trilha.gravadas).toStrictEqual([
      {
        em: AGORA,
        autorId: USUARIO,
        operacao: 'AUDITORIA_CONSULTADA',
        agregadoTipo: 'Auditoria',
        agregadoId: INSTITUICAO,
        pessoaAlvoId: null,
        detalhes: [],
        sensivel: true,
      },
    ]);
  });

  it('leva o filtro usado como detalhe e nunca o cursor nem o limite', async () => {
    const { consultar, trilha } = montar();
    const depois = codificarCursor({ em: AGORA, id: '0195c3a0-0000-7000-8000-000000000009' });

    await consultar.executar(ACESSO, {
      de: '2026-03-01T00:00:00.000Z',
      ate: '2026-03-04T00:00:00.000Z',
      operacao: 'GRUPO_EDITADO',
      depois,
      limite: LIMITE,
    });

    expect(trilha.gravadas[0]?.detalhes).toStrictEqual([
      { rotulo: ROTULOS_DE_AUDITORIA.periodoInicial, valor: '2026-03-01T00:00:00.000Z' },
      { rotulo: ROTULOS_DE_AUDITORIA.periodoFinal, valor: '2026-03-04T00:00:00.000Z' },
      { rotulo: ROTULOS_DE_AUDITORIA.operacao, valor: 'GRUPO_EDITADO' },
    ]);
  });

  it('repassa ao leitor período, operação, posição do cursor e um item a mais que o limite', async () => {
    const { consultar, leitor } = montar();
    const posicao = { em: new Date('2026-03-04T12:00:00.000Z'), id: '0195c3a0-0000-7000-8000-000000000009' };

    await consultar.executar(ACESSO, {
      de: '2026-03-01T00:00:00.000Z',
      ate: '2026-03-04T00:00:00.000Z',
      operacao: 'GRUPO_ALTERADO',
      depois: codificarCursor(posicao),
      limite: LIMITE,
    });

    expect(leitor.consultas).toStrictEqual([
      {
        de: new Date('2026-03-01T00:00:00.000Z'),
        ate: new Date('2026-03-04T00:00:00.000Z'),
        operacao: 'GRUPO_ALTERADO',
        depois: posicao,
        limite: LIMITE + 1,
      },
    ]);
  });

  it('sem filtro repassa só a primeira página', async () => {
    const { consultar, leitor } = montar();

    await consultar.executar(ACESSO, { limite: LIMITE });

    expect(leitor.consultas).toStrictEqual([{ depois: null, limite: LIMITE + 1 }]);
  });

  it('com mais registros que o limite devolve a página cheia e o cursor do último item', async () => {
    const { consultar } = montar([registro(1), registro(2), registro(3)]);

    const pagina = await consultar.executar(ACESSO, { limite: LIMITE });

    expect(pagina.itens.map(({ id }) => id)).toEqual([registro(1).id, registro(2).id]);
    expect(pagina.proxima).toBe(codificarCursor({ em: new Date(registro(2).em), id: registro(2).id }));
  });

  it('com registros até o limite não devolve cursor', async () => {
    const { consultar } = montar([registro(1), registro(2)]);

    const pagina = await consultar.executar(ACESSO, { limite: LIMITE });

    expect(pagina.itens).toHaveLength(2);
    expect(pagina.proxima).toBeNull();
  });

  it('cursor inválido vira CORPO_INVALIDO e não registra consulta nem lê', async () => {
    const { consultar, trilha, leitor } = montar();

    const tentativa = consultar.executar(ACESSO, { depois: 'lixo', limite: LIMITE });

    await expect(tentativa).rejects.toBeInstanceOf(ErroDeDominioException);
    await expect(tentativa).rejects.toMatchObject({
      erroDeDominio: { codigo: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: 'depois' }] } },
    });
    expect(trilha.gravadas).toEqual([]);
    expect(leitor.consultas).toEqual([]);
  });
});
