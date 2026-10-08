import { randomUUID } from 'node:crypto';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, criarEvento, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { err } from '../../src/shared/kernel/result.js';
import { erroDeDominio } from '../../src/shared/kernel/erro-de-dominio.js';
import { ErroDeEventoSemMapeamento } from '../../src/modules/identidade/application/auditoria/mapeamento-de-eventos.js';
import { Usuario } from '../../src/modules/identidade/domain/usuario/usuario.js';
import {
  abrirAmbienteDaIdentidade,
  AGORA,
  AUTOR,
  consultarNaInstituicao,
  EM_72_HORAS,
  hashDeConvite,
  novoGrupo,
  novoUsuarioConvidado,
} from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const DEPOIS = new Date('2026-03-02T10:00:00.000Z');
const SUBJECT = 'sub-keycloak-1';

interface LinhaDaTrilha {
  em: Date;
  autor_tipo: string;
  autor_usuario_id: string | null;
  autor_grupos: string[];
  operacao: string;
  agregado_tipo: string;
  agregado_id: string;
  pessoa_alvo_id: string | null;
  detalhes: Array<{ rotulo: string; valor: string; anterior?: string }>;
  sensivel: boolean;
  correlacao_id: string | null;
}

describe('trilha de auditoria gravada na transação do ato', () => {
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

  function trilhaDe(agregadoId: string, instituicaoId: string = INSTITUICAO_A): Promise<LinhaDaTrilha[]> {
    return consultarNaInstituicao<LinhaDaTrilha>(
      banco,
      instituicaoId,
      `select em, autor_tipo, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id,
              pessoa_alvo_id, detalhes, sensivel, correlacao_id
         from identidade.registro_de_auditoria where agregado_id = $1 order by operacao`,
      [agregadoId],
    );
  }

  async function criarGrupos(quantidade: number): Promise<GrupoId[]> {
    const grupos = Array.from({ length: quantidade }, () => novoGrupo());
    for (const grupo of grupos) {
      // eslint-disable-next-line no-await-in-loop -- sequência simplifica o teste
      await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    }
    return grupos.map((grupo) => grupo.id);
  }

  async function carregar(id: UsuarioId): Promise<Usuario> {
    const usuario = await naInstituicaoA(() => ambiente.usuarios.porId(id));
    if (usuario === undefined) throw new Error('usuário não encontrado');
    return usuario;
  }

  async function autorComGrupos(grupos: readonly GrupoId[]): Promise<Usuario> {
    const autor = novoUsuarioConvidado(grupos);
    await naInstituicaoA(() => ambiente.usuarios.adicionar(autor));
    return autor;
  }

  function convidadoPor(autor: UsuarioId): Usuario {
    return Usuario.convidar({
      id: randomUUID() as UsuarioId,
      nome: 'Convidada Reservada',
      email: `${randomUUID()}@reservada.org`,
      grupos: [],
      hashDoConvite: hashDeConvite(),
      conviteExpiraEm: EM_72_HORAS,
      convidadoPor: autor,
      em: AGORA,
    });
  }

  it('adicionar grava o ato e a trilha juntos, com a fotografia dos grupos do autor', async () => {
    const [grupoA, grupoB] = await criarGrupos(2);
    const autor = await autorComGrupos([grupoB!, grupoA!]);
    const convidado = convidadoPor(autor.id);

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const [linha, ...demais] = await trilhaDe(convidado.id);
    expect(demais).toEqual([]);
    expect(linha).toMatchObject({
      em: AGORA,
      autor_tipo: 'USUARIO',
      autor_usuario_id: autor.id,
      autor_grupos: [grupoA, grupoB].toSorted(),
      operacao: 'USUARIO_CONVIDADO',
      agregado_tipo: 'Usuario',
      agregado_id: convidado.id,
      pessoa_alvo_id: null,
      detalhes: [],
      sensivel: false,
    });
  });

  it('a trilha não guarda nome nem e-mail do convidado', async () => {
    const convidado = convidadoPor(AUTOR);

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const [cru] = await consultarNaInstituicao<{ texto: string }>(
      banco,
      INSTITUICAO_A,
      'select registro_de_auditoria::text as texto from identidade.registro_de_auditoria where agregado_id = $1',
      [convidado.id],
    );
    expect(cru?.texto).not.toContain(convidado.email);
    expect(cru?.texto).not.toContain(convidado.nome);
  });

  it('autor sem grupos atribuídos grava fotografia vazia', async () => {
    const convidado = convidadoPor(AUTOR);

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    expect(await trilhaDe(convidado.id)).toMatchObject([{ autor_usuario_id: AUTOR, autor_grupos: [] }]);
  });

  it('a correlação da requisição fica na linha da trilha', async () => {
    const correlacaoId = randomUUID();
    const convidado = convidadoPor(AUTOR);

    await ContextoDaRequisicao.executar({ correlacaoId, instituicaoId: INSTITUICAO_A }, () =>
      ambiente.usuarios.adicionar(convidado),
    );

    expect(await trilhaDe(convidado.id)).toMatchObject([{ correlacao_id: correlacaoId }]);
  });

  it('mudança de grupos registra antes e depois, e a fotografia é a de antes do ato', async () => {
    const [grupoA, grupoB, grupoC] = await criarGrupos(3);
    const autor = await autorComGrupos([grupoA!, grupoB!]);
    const usuario = await carregar(autor.id);
    usuario.definirGrupos([grupoC!], autor.id, DEPOIS);

    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    const linhas = await trilhaDe(autor.id);
    const alterado = linhas.find((linha) => linha.operacao === 'GRUPO_ALTERADO');
    expect(alterado).toMatchObject({
      autor_tipo: 'USUARIO',
      autor_usuario_id: autor.id,
      autor_grupos: [grupoA, grupoB].toSorted(),
      detalhes: [{ rotulo: 'Grupos', valor: grupoC, anterior: [grupoA, grupoB].join(',') }],
    });
  });

  it('suspensão e reativação registram uma linha cada, com o motivo de cada uma', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const usuario = await carregar(convidado.id);
    usuario.ativar(convidado.convite!.hashDoToken, SUBJECT, DEPOIS);
    usuario.desativar(AUTOR, 'afastamento', DEPOIS);
    usuario.reativar(AUTOR, 'retorno', DEPOIS);

    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    const linhas = await trilhaDe(convidado.id);
    expect(linhas.map((linha) => linha.operacao).toSorted()).toEqual(
      ['USUARIO_ATIVADO', 'USUARIO_CONVIDADO', 'USUARIO_REATIVADO', 'USUARIO_SUSPENSO'].toSorted(),
    );
    expect(linhas.find((linha) => linha.operacao === 'USUARIO_SUSPENSO')?.detalhes).toEqual([
      { rotulo: 'Motivo', valor: 'afastamento' },
    ]);
    expect(linhas.find((linha) => linha.operacao === 'USUARIO_REATIVADO')?.detalhes).toEqual([
      { rotulo: 'Motivo', valor: 'retorno' },
    ]);
    expect(linhas.filter((linha) => linha.sensivel).map((linha) => linha.operacao).toSorted()).toEqual([
      'USUARIO_REATIVADO',
      'USUARIO_SUSPENSO',
    ]);
    expect(linhas.find((linha) => linha.operacao === 'USUARIO_ATIVADO')).toMatchObject({
      autor_tipo: 'USUARIO',
      autor_usuario_id: convidado.id,
    });
  });

  it('edição de grupo grava GRUPO_EDITADO com o autor e a ação', async () => {
    const grupo = novoGrupo();
    await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    const carregado = await naInstituicaoA(() => ambiente.grupos.porId(grupo.id));
    carregado!.concederPermissao('estoque.saldo.ler', AUTOR, DEPOIS);
    carregado!.renomear('Novo nome', 'Nova descrição', AUTOR, DEPOIS);

    await naInstituicaoA(() => ambiente.grupos.salvar(carregado!));

    const linhas = await trilhaDe(grupo.id);
    expect(linhas).toHaveLength(2);
    expect(linhas).toMatchObject([
      { operacao: 'GRUPO_EDITADO', agregado_tipo: 'Grupo', autor_usuario_id: AUTOR, autor_tipo: 'USUARIO' },
      { operacao: 'GRUPO_EDITADO', agregado_tipo: 'Grupo', autor_usuario_id: AUTOR, autor_tipo: 'USUARIO' },
    ]);
    expect(linhas.flatMap((linha) => linha.detalhes.map((detalhe) => detalhe.valor))).toEqual(
      expect.arrayContaining(['CONCEDIDA', 'estoque.saldo.ler', 'RENOMEADO', 'Novo nome']),
    );
  });

  it('evento sem autor humano é gravado como SISTEMA, sem usuário e sem grupos', async () => {
    const agregadoId = randomUUID();
    const evento = criarEvento({
      tipo: 'USUARIO_REATIVADO',
      agregadoTipo: 'Usuario',
      agregadoId,
      ocorridoEm: DEPOIS,
      dados: { motivo: 'retorno' },
    });

    await naInstituicaoA(() =>
      ambiente.unidadeDeTrabalho.transacao('escrita', (contexto) => ambiente.trilha.gravarEventos(contexto, [evento])),
    );

    expect(await trilhaDe(agregadoId)).toMatchObject([
      { autor_tipo: 'SISTEMA', autor_usuario_id: null, autor_grupos: [], operacao: 'USUARIO_REATIVADO', em: DEPOIS },
    ]);
  });

  it('evento sem mapeamento é erro de programação e não deixa linha', async () => {
    const agregadoId = randomUUID();
    const evento = criarEvento({ tipo: 'EVENTO_NOVO', agregadoTipo: 'Usuario', agregadoId });

    const tentativa = naInstituicaoA(() =>
      ambiente.unidadeDeTrabalho.transacao('escrita', (contexto) => ambiente.trilha.gravarEventos(contexto, [evento])),
    );

    await expect(tentativa).rejects.toBeInstanceOf(ErroDeEventoSemMapeamento);
    expect(await trilhaDe(agregadoId)).toEqual([]);
  });

  it('exceção depois de gravar desfaz a trilha junto com o agregado', async () => {
    const convidado = convidadoPor(AUTOR);

    const tentativa = naInstituicaoA(() =>
      ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
        await ambiente.usuarios.adicionar(convidado);
        throw new Error('falha depois de gravar');
      }),
    );

    await expect(tentativa).rejects.toThrow('falha depois de gravar');
    expect(await trilhaDe(convidado.id)).toEqual([]);
    expect(await naInstituicaoA(() => ambiente.usuarios.porId(convidado.id))).toBeUndefined();
  });

  it('Result de erro depois de gravar desfaz a trilha junto com o agregado', async () => {
    const convidado = convidadoPor(AUTOR);

    const resultado = await naInstituicaoA(() =>
      ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
        await ambiente.usuarios.adicionar(convidado);
        return err(erroDeDominio('MOTIVO_OBRIGATORIO'));
      }),
    );

    expect(resultado).toMatchObject({ tipo: 'erro' });
    expect(await trilhaDe(convidado.id)).toEqual([]);
    expect(await naInstituicaoA(() => ambiente.usuarios.porId(convidado.id))).toBeUndefined();
  });

  it('conflito de versão ao salvar não deixa linha nova na trilha', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const primeiro = await carregar(convidado.id);
    const segundo = await carregar(convidado.id);
    primeiro.definirGrupos([], AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(primeiro));
    segundo.desativar(AUTOR, 'motivo', DEPOIS);
    segundo.reenviarConvite(hashDeConvite(), EM_72_HORAS, AUTOR, DEPOIS);

    await expect(naInstituicaoA(() => ambiente.usuarios.salvar(segundo))).rejects.toThrow();

    expect((await trilhaDe(convidado.id)).map((linha) => linha.operacao)).toEqual(['USUARIO_CONVIDADO']);
  });

  it('a trilha da instituição A não é visível na instituição B', async () => {
    const convidado = convidadoPor(AUTOR);
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    expect(await trilhaDe(convidado.id, INSTITUICAO_B)).toEqual([]);
  });
});
