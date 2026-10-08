import { OptimisticLockError } from '@mikro-orm/core';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { comContexto, INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';
import { gerarUuidV7 } from '../../src/shared/kernel/ids.js';
import { RepositorioDoOutbox } from '../../src/shared/infrastructure/eventos/repositorio-do-outbox.js';
import { ehVersaoDesatualizada } from '../../src/shared/infrastructure/banco/classificacao-de-erros-do-banco.js';
import { Usuario } from '../../src/modules/identidade/domain/usuario/usuario.js';
import { RepositorioDeUsuarioMikroOrm } from '../../src/modules/identidade/infrastructure/persistencia/repositorio-de-usuario.mikro-orm.js';
import {
  abrirAmbienteDaIdentidade,
  AGORA,
  AUTOR,
  consultarNaInstituicao,
  EM_72_HORAS,
  eventosDoOutbox,
  hashDeConvite,
  novoGrupo,
  novoUsuarioConvidado,
} from './apoio.js';
import type { AmbienteDaIdentidade } from './apoio.js';

const DEPOIS = new Date('2026-03-02T10:00:00.000Z');
const SUBJECT = 'sub-keycloak-1';

interface LinhaDoUsuario {
  situacao: string;
  subject_id: string | null;
  versao: number;
  ativado_em: Date | null;
  suspenso_em: Date | null;
}

interface LinhaDoConvite {
  token_sha256: Buffer;
  criado_por: string;
  criado_em: Date;
  expira_em: Date;
  usado_em: Date | null;
  revogado_em: Date | null;
}

interface LinhaDaAtribuicao {
  grupo_id: string;
  atribuido_por: string;
  atribuido_em: Date;
}

describe('RepositorioDeUsuarioMikroOrm', () => {
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

  async function criarGrupos(quantidade: number): Promise<GrupoId[]> {
    const grupos = Array.from({ length: quantidade }, () => novoGrupo());
    for (const grupo of grupos) {
      // eslint-disable-next-line no-await-in-loop -- nomes únicos, ordem irrelevante; sequência simplifica o teste
      await naInstituicaoA(() => ambiente.grupos.adicionar(grupo));
    }
    return grupos.map((grupo) => grupo.id);
  }

  function linhaDoUsuario(id: UsuarioId): Promise<LinhaDoUsuario | undefined> {
    return consultarNaInstituicao<LinhaDoUsuario>(
      banco,
      INSTITUICAO_A,
      'select situacao, subject_id, versao, ativado_em, suspenso_em from identidade.usuario where id = $1',
      [id],
    ).then(([linha]) => linha);
  }

  function convitesDoUsuario(id: UsuarioId): Promise<LinhaDoConvite[]> {
    return consultarNaInstituicao<LinhaDoConvite>(
      banco,
      INSTITUICAO_A,
      `select token_sha256, criado_por, criado_em, expira_em, usado_em, revogado_em
         from identidade.convite where usuario_id = $1 order by criado_em, id`,
      [id],
    );
  }

  function atribuicoesDoUsuario(id: UsuarioId): Promise<LinhaDaAtribuicao[]> {
    return consultarNaInstituicao<LinhaDaAtribuicao>(
      banco,
      INSTITUICAO_A,
      'select grupo_id, atribuido_por, atribuido_em from identidade.usuario_grupo where usuario_id = $1 order by grupo_id',
      [id],
    );
  }

  async function carregar(id: UsuarioId): Promise<Usuario> {
    const usuario = await naInstituicaoA(() => ambiente.usuarios.porId(id));
    if (usuario === undefined) throw new Error('usuário não encontrado');
    return usuario;
  }

  it('adiciona o convidado e o reconstitui idêntico, com convite, grupos, autor e versão', async () => {
    const [grupoA, grupoB] = await criarGrupos(2);
    const convidado = novoUsuarioConvidado([grupoA!, grupoB!]);
    const hash = convidado.convite!.hashDoToken;

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const recarregado = await carregar(convidado.id);

    expect(recarregado).toMatchObject({
      id: convidado.id,
      nome: convidado.nome,
      email: convidado.email,
      situacao: 'CONVITE_PENDENTE',
      subjectId: null,
      pessoaId: null,
      ativadoEm: null,
      suspensoEm: null,
      ultimoAcessoEm: null,
      versao: 1,
    });
    expect([...recarregado.grupos].toSorted()).toEqual([grupoA, grupoB].toSorted());
    expect(recarregado.convite).toMatchObject({
      hashDoToken: hash,
      criadoPor: AUTOR,
      criadoEm: AGORA,
      expiraEm: EM_72_HORAS,
      usadoEm: null,
      revogadoEm: null,
    });
    expect(recarregado.retirarEventos()).toEqual([]);
  });

  it('grava quem atribuiu cada grupo e quando', async () => {
    const [grupo] = await criarGrupos(1);
    const convidado = novoUsuarioConvidado([grupo!]);

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    expect(await atribuicoesDoUsuario(convidado.id)).toEqual([
      { grupo_id: grupo, atribuido_por: AUTOR, atribuido_em: AGORA },
    ]);
  });

  it('o hash do convite vai ao banco como bytes do sha256, não como texto', async () => {
    const convidado = novoUsuarioConvidado();

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const [convite] = await convitesDoUsuario(convidado.id);
    expect(convite?.token_sha256.toString('hex')).toBe(convidado.convite!.hashDoToken);
    expect(convite?.token_sha256).toHaveLength(32);
  });

  it('grava os eventos do agregado no outbox, na ordem, ao adicionar', async () => {
    const convidado = novoUsuarioConvidado();

    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    expect(await eventosDoOutbox(banco, convidado.id)).toEqual(['USUARIO_CONVIDADO']);
  });

  it('ativar grava situação, subject, ativado_em, uso do convite, versão 2 e o evento', async () => {
    const convidado = novoUsuarioConvidado();
    const hash = convidado.convite!.hashDoToken;
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const usuario = await carregar(convidado.id);
    usuario.ativar(hash, SUBJECT, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    expect(await linhaDoUsuario(convidado.id)).toMatchObject({
      situacao: 'ATIVO',
      subject_id: SUBJECT,
      versao: 2,
      ativado_em: DEPOIS,
      suspenso_em: null,
    });
    const [convite] = await convitesDoUsuario(convidado.id);
    expect(convite).toMatchObject({ usado_em: DEPOIS, revogado_em: null });
    expect(await eventosDoOutbox(banco, convidado.id)).toEqual(['USUARIO_CONVIDADO', 'USUARIO_ATIVADO']);
    const recarregado = await carregar(convidado.id);
    expect(recarregado).toMatchObject({ situacao: 'ATIVO', subjectId: SUBJECT, ativadoEm: DEPOIS, versao: 2 });
    expect(recarregado.convite?.usadoEm).toEqual(DEPOIS);
  });

  it('reenviar revoga o convite anterior na mesma gravação e deixa o novo como atual', async () => {
    const convidado = novoUsuarioConvidado();
    const hashAntigo = convidado.convite!.hashDoToken;
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const usuario = await carregar(convidado.id);
    const novoHash = hashDeConvite();
    usuario.reenviarConvite(novoHash, new Date(DEPOIS.getTime() + 3_600_000), AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    const [antigo, novo] = await convitesDoUsuario(convidado.id);
    expect(antigo?.token_sha256.toString('hex')).toBe(hashAntigo);
    expect(antigo?.revogado_em).toEqual(DEPOIS);
    expect(novo?.token_sha256.toString('hex')).toBe(novoHash);
    expect(novo).toMatchObject({ revogado_em: null, usado_em: null, criado_em: DEPOIS });
    expect((await carregar(convidado.id)).convite?.hashDoToken).toBe(novoHash);
  });

  it('dois reenvios na mesma gravação deixam os dois anteriores revogados e só o último vigente', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const usuario = await carregar(convidado.id);
    const expiraEm = new Date(DEPOIS.getTime() + 3_600_000);
    usuario.reenviarConvite(hashDeConvite(), expiraEm, AUTOR, DEPOIS);
    const ultimoHash = hashDeConvite();
    usuario.reenviarConvite(ultimoHash, expiraEm, AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    const convites = await convitesDoUsuario(convidado.id);
    expect(convites.filter((convite) => convite.revogado_em === null)).toHaveLength(1);
    expect(convites).toHaveLength(3);
    expect((await carregar(convidado.id)).convite?.hashDoToken).toBe(ultimoHash);
  });

  it('desativar grava suspenso_em, e reativar o limpa', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const ativado = await carregar(convidado.id);
    ativado.ativar(convidado.convite!.hashDoToken, SUBJECT, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(ativado));

    const suspenso = await carregar(convidado.id);
    suspenso.desativar(AUTOR, 'saiu da casa', EM_72_HORAS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(suspenso));
    expect(await linhaDoUsuario(convidado.id)).toMatchObject({
      situacao: 'SUSPENSO',
      suspenso_em: EM_72_HORAS,
      ativado_em: DEPOIS,
      versao: 3,
    });

    const reativado = await carregar(convidado.id);
    reativado.reativar(AUTOR, EM_72_HORAS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(reativado));
    expect(await linhaDoUsuario(convidado.id)).toMatchObject({ situacao: 'ATIVO', suspenso_em: null, versao: 4 });
  });

  it('definirGrupos remove o que saiu, acrescenta o que entrou com o autor da mudança e preserva o resto', async () => {
    const [mantido, removido, acrescentado] = await criarGrupos(3);
    const convidado = novoUsuarioConvidado([mantido!, removido!]);
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const outroAutor = gerarUuidV7() as UsuarioId;

    const usuario = await carregar(convidado.id);
    usuario.definirGrupos([mantido!, acrescentado!], outroAutor, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    const atribuicoes = await atribuicoesDoUsuario(convidado.id);
    expect(atribuicoes.map((atribuicao) => atribuicao.grupo_id).toSorted()).toEqual(
      [mantido, acrescentado].toSorted(),
    );
    const doMantido = atribuicoes.find((atribuicao) => atribuicao.grupo_id === mantido);
    const doAcrescentado = atribuicoes.find((atribuicao) => atribuicao.grupo_id === acrescentado);
    expect(doMantido).toMatchObject({ atribuido_por: AUTOR, atribuido_em: AGORA });
    expect(doAcrescentado).toMatchObject({ atribuido_por: outroAutor, atribuido_em: DEPOIS });
    expect(await eventosDoOutbox(banco, convidado.id)).toEqual(['USUARIO_CONVIDADO', 'GRUPO_ALTERADO']);
  });

  it('esvaziar os grupos remove todas as atribuições', async () => {
    const [grupo] = await criarGrupos(1);
    const convidado = novoUsuarioConvidado([grupo!]);
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const usuario = await carregar(convidado.id);
    usuario.definirGrupos([], AUTOR, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(usuario));

    expect(await atribuicoesDoUsuario(convidado.id)).toEqual([]);
    expect((await carregar(convidado.id)).grupos).toEqual([]);
  });

  it('salvar com versão defasada falha com OptimisticLockError e não grava nada', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const primeiro = await carregar(convidado.id);
    const segundo = await carregar(convidado.id);
    primeiro.desativar(AUTOR, 'motivo', DEPOIS);
    segundo.definirGrupos([], AUTOR, DEPOIS);
    segundo.reenviarConvite(hashDeConvite(), EM_72_HORAS, AUTOR, DEPOIS);
    primeiro.ativar(convidado.convite!.hashDoToken, SUBJECT, DEPOIS);
    await naInstituicaoA(() => ambiente.usuarios.salvar(primeiro));

    const tentativa = naInstituicaoA(() => ambiente.usuarios.salvar(segundo));

    await expect(tentativa).rejects.toBeInstanceOf(OptimisticLockError);
    await expect(tentativa).rejects.toSatisfy(ehVersaoDesatualizada);
    expect(await linhaDoUsuario(convidado.id)).toMatchObject({ situacao: 'ATIVO', versao: 2 });
    expect(await convitesDoUsuario(convidado.id)).toHaveLength(1);
    expect(await eventosDoOutbox(banco, convidado.id)).toEqual(['USUARIO_CONVIDADO', 'USUARIO_ATIVADO']);
  });

  it('falha ao gravar o evento desfaz a versão incrementada: mesma transação', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const outboxQueFalha: RepositorioDoOutbox = {
      gravar: () => Promise.reject(new Error('outbox indisponível')),
    };
    const repositorioComOutboxQuebrado = new RepositorioDeUsuarioMikroOrm(ambiente.unidadeDeTrabalho, outboxQueFalha);
    const usuario = await carregar(convidado.id);
    usuario.desativar(AUTOR, 'motivo', DEPOIS);

    await expect(naInstituicaoA(() => repositorioComOutboxQuebrado.salvar(usuario))).rejects.toThrow(
      'outbox indisponível',
    );

    expect(await linhaDoUsuario(convidado.id)).toMatchObject({ situacao: 'CONVITE_PENDENTE', versao: 1 });
  });

  it('adicionar com e-mail repetido na instituição desfaz também o outbox', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));
    const homonimo = Usuario.convidar({
      id: gerarUuidV7() as UsuarioId,
      nome: 'Outra',
      email: convidado.email.toUpperCase(),
      grupos: [],
      hashDoConvite: hashDeConvite(),
      conviteExpiraEm: EM_72_HORAS,
      convidadoPor: AUTOR,
      em: AGORA,
    });

    await expect(naInstituicaoA(() => ambiente.usuarios.adicionar(homonimo))).rejects.toThrow();

    expect(await eventosDoOutbox(banco, homonimo.id)).toEqual([]);
    expect(await linhaDoUsuario(homonimo.id)).toBeUndefined();
  });

  it('porId devolve undefined para id inexistente', async () => {
    expect(await naInstituicaoA(() => ambiente.usuarios.porId(gerarUuidV7() as UsuarioId))).toBeUndefined();
  });

  it('lê o estado novo quando o mesmo usuário é relido na mesma transação', async () => {
    const convidado = novoUsuarioConvidado();
    await naInstituicaoA(() => ambiente.usuarios.adicionar(convidado));

    const situacoes = await naInstituicaoA(() =>
      ambiente.unidadeDeTrabalho.transacao('escrita', async () => {
        const usuario = (await ambiente.usuarios.porId(convidado.id))!;
        const antes = usuario.situacao;
        usuario.ativar(convidado.convite!.hashDoToken, SUBJECT, DEPOIS);
        await ambiente.usuarios.salvar(usuario);
        const depois = (await ambiente.usuarios.porId(convidado.id))!;
        return [antes, depois.situacao, depois.versao];
      }),
    );

    expect(situacoes).toEqual(['CONVITE_PENDENTE', 'ATIVO', 2]);
  });
});
