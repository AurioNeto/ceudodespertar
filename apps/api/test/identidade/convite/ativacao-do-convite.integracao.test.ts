import { createHash, randomUUID } from 'node:crypto';
import type { UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA } from '../../../src/shared/infrastructure/idempotencia/cabecalho-de-idempotencia.js';
import { gerarUuidV7 } from '../../../src/shared/kernel/ids.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { subirAplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import type { AplicacaoDeAcesso } from '../acesso/ambiente-http.js';
import { consultarNaInstituicao, eventosDoOutbox } from '../apoio.js';
import { convitesDoUsuario } from './apoio-de-convite.js';

const ROTA_ATIVACAO = '/api/v1/eu/ativacao';
const ROTA_EU = '/api/v1/eu';
const SUJEITO_DA_MARIA = 'sub-maria';
const SUJEITO_DO_JOAO = 'sub-joao';
const EMAIL_DA_MARIA = 'maria@casa.org';
const EMAIL_DO_JOAO = 'joao@casa.org';
const HORAS_DO_CONVITE = 72;
const MILISSEGUNDOS_POR_HORA = 3_600_000;
const INTERVALO_DE_REENVIO_EM_MS = 60_000;
const AUTOR = gerarUuidV7() as UsuarioId;
const CABECALHO_DE_CHAVE = { [NOME_DO_CABECALHO_DE_IDEMPOTENCIA]: 'chave-automatica-do-front-0001' };

const sha256Hex = (texto: string): string => createHash('sha256').update(texto).digest('hex');

function tokenNovo(): string {
  return randomUUID().replaceAll('-', '').padEnd(43, 'A').slice(0, 43);
}

class ConferidorFalso extends ConferidorDeSujeito {
  readonly consultados: string[] = [];
  readonly emails = new Map<string, string>();
  indisponivel = false;
  private aguardando: Array<() => void> = [];
  private largadaMinima = 0;

  emailDo(sujeito: string): Promise<string | undefined> {
    this.consultados.push(sujeito);
    if (this.indisponivel) return Promise.reject(new ProvedorDeIdentidadeIndisponivel('fora do ar'));
    const resposta = this.emails.get(sujeito);
    if (this.largadaMinima === 0) return Promise.resolve(resposta);
    return new Promise((resolver) => {
      this.aguardando.push(() => resolver(resposta));
      if (this.aguardando.length >= this.largadaMinima) {
        for (const liberar of this.aguardando.splice(0)) liberar();
      }
    });
  }

  segurarAte(chamadas: number): void {
    this.largadaMinima = chamadas;
  }
}

describe('POST /api/v1/eu/ativacao — ativação do convite com Postgres real', () => {
  let banco: BancoDeTeste;
  let aplicacao: AplicacaoDeAcesso;
  let conferidor: ConferidorFalso;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    conferidor = new ConferidorFalso();
    conferidor.emails.set(SUJEITO_DA_MARIA, EMAIL_DA_MARIA);
    conferidor.emails.set(SUJEITO_DO_JOAO, EMAIL_DO_JOAO);
    aplicacao = await subirAplicacaoDeAcesso(banco, [{ provider: ConferidorDeSujeito, valor: conferidor }]);
  });

  afterEach(async () => {
    await aplicacao.encerrar();
    await derrubarBancoDeTeste(banco);
  });

  async function convidar(email: string, instituicaoId: string = INSTITUICAO_A): Promise<{ id: UsuarioId; token: string }> {
    const token = tokenNovo();
    const agora = aplicacao.relogio.agora();
    const usuario = Usuario.convidar({
      id: gerarUuidV7() as UsuarioId,
      nome: 'Pessoa Convidada',
      email,
      grupos: [],
      hashDoConvite: sha256Hex(token),
      conviteExpiraEm: new Date(agora.getTime() + HORAS_DO_CONVITE * MILISSEGUNDOS_POR_HORA),
      convidadoPor: AUTOR,
      em: agora,
    });
    await comContexto(instituicaoId, () => aplicacao.usuarios.adicionar(usuario));
    await aplicacao.entregarEventos();
    return { id: usuario.id, token };
  }

  async function ativar(sujeito: string, convite: string, cabecalhos: Record<string, string> = CABECALHO_DE_CHAVE) {
    const resposta = await aplicacao.pedirComo(sujeito, ROTA_ATIVACAO, { metodo: 'POST', corpo: { convite }, cabecalhos });
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  }

  async function estadoNoBanco(usuarioId: UsuarioId, instituicaoId: string = INSTITUICAO_A) {
    const [linha] = await consultarNaInstituicao<{
      situacao: string;
      subject_id: string | null;
      ativado_em: Date | null;
      versao: number;
    }>(banco, instituicaoId, 'select situacao, subject_id, ativado_em, versao from identidade.usuario where id = $1', [usuarioId]);
    return linha!;
  }

  async function conviteUsadoEm(usuarioId: UsuarioId, instituicaoId: string = INSTITUICAO_A): Promise<Date | null> {
    const [linha] = await consultarNaInstituicao<{ usado_em: Date | null }>(
      banco,
      instituicaoId,
      'select usado_em from identidade.convite where usuario_id = $1 order by criado_em desc',
      [usuarioId],
    );
    return linha!.usado_em;
  }

  async function trilhaDeAtivacao(usuarioId: UsuarioId, instituicaoId: string = INSTITUICAO_A): Promise<number> {
    const linhas = await consultarNaInstituicao(
      banco,
      instituicaoId,
      "select 1 from identidade.registro_de_auditoria where agregado_id = $1 and operacao = 'USUARIO_ATIVADO'",
      [usuarioId],
    );
    return linhas.length;
  }

  async function eventosDeAtivacaoNoOutbox(usuarioId: UsuarioId): Promise<number> {
    return (await eventosDoOutbox(banco, usuarioId)).filter((tipo) => tipo === 'USUARIO_ATIVADO').length;
  }

  it('ativa com Idempotency-Key presente: 200, subject_id, ativado_em, convite usado, trilha e outbox, e GET /eu passa a 200', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    expect((await aplicacao.pedirComo(SUJEITO_DA_MARIA, ROTA_EU)).status).toBe(401);

    const resposta = await ativar(SUJEITO_DA_MARIA, token);

    expect(resposta).toEqual({ status: 200, corpo: { situacao: 'ATIVO' } });
    expect(await estadoNoBanco(id)).toMatchObject({ situacao: 'ATIVO', subject_id: SUJEITO_DA_MARIA, versao: 2 });
    expect((await estadoNoBanco(id)).ativado_em).toBeInstanceOf(Date);
    expect(await conviteUsadoEm(id)).toBeInstanceOf(Date);
    expect(await trilhaDeAtivacao(id)).toBe(1);
    expect(await eventosDeAtivacaoNoOutbox(id)).toBe(1);

    await aplicacao.entregarEventos();
    expect((await aplicacao.pedirComo(SUJEITO_DA_MARIA, ROTA_EU)).status).toBe(200);
  });

  it('ativa sem Idempotency-Key também', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);

    expect((await ativar(SUJEITO_DA_MARIA, token, {})).status).toBe(200);
    expect((await estadoNoBanco(id)).situacao).toBe('ATIVO');
  });

  it('o resultado independe da instituição do bearer: o convite da casa B ativa na casa B', async () => {
    const { id, token } = await convidar(EMAIL_DO_JOAO, INSTITUICAO_B);

    expect((await ativar(SUJEITO_DO_JOAO, token)).status).toBe(200);
    expect(await estadoNoBanco(id, INSTITUICAO_B)).toMatchObject({ situacao: 'ATIVO', subject_id: SUJEITO_DO_JOAO });
    expect(await trilhaDeAtivacao(id, INSTITUICAO_B)).toBe(1);
  });

  it('token que nunca foi emitido: 400 CONVITE_INVALIDO e nenhuma chamada ao Admin API', async () => {
    await convidar(EMAIL_DA_MARIA);

    const resposta = await ativar(SUJEITO_DA_MARIA, tokenNovo());

    expect(resposta.status).toBe(400);
    expect(resposta.corpo.erro).toBe('CONVITE_INVALIDO');
    expect(conferidor.consultados).toEqual([]);
  });

  it('repetir com o mesmo sub e o mesmo convite devolve 200 igual, sem segunda gravação nem outra consulta', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    await ativar(SUJEITO_DA_MARIA, token);
    const antes = await estadoNoBanco(id);

    const repeticao = await ativar(SUJEITO_DA_MARIA, token);

    expect(repeticao).toEqual({ status: 200, corpo: { situacao: 'ATIVO' } });
    expect(await estadoNoBanco(id)).toEqual(antes);
    expect(await trilhaDeAtivacao(id)).toBe(1);
    expect(await eventosDeAtivacaoNoOutbox(id)).toBe(1);
    expect(conferidor.consultados).toEqual([SUJEITO_DA_MARIA]);
  });

  it('convite já usado por outro sub: 409 CONVITE_JA_USADO e o vínculo original não muda', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    await ativar(SUJEITO_DA_MARIA, token);

    const resposta = await ativar(SUJEITO_DO_JOAO, token);

    expect(resposta.status).toBe(409);
    expect(resposta.corpo.erro).toBe('CONVITE_JA_USADO');
    expect((await estadoNoBanco(id)).subject_id).toBe(SUJEITO_DA_MARIA);
    expect(conferidor.consultados).toEqual([SUJEITO_DA_MARIA]);
  });

  it('e-mail do sub diferente do convite: 403 CONVITE_DE_OUTRO_SUJEITO e nada é gravado', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);

    const resposta = await ativar(SUJEITO_DO_JOAO, token);

    expect(resposta.status).toBe(403);
    expect(resposta.corpo.erro).toBe('CONVITE_DE_OUTRO_SUJEITO');
    expect(await estadoNoBanco(id)).toMatchObject({ situacao: 'CONVITE_PENDENTE', subject_id: null, versao: 1 });
    expect(await conviteUsadoEm(id)).toBeNull();
    expect(await trilhaDeAtivacao(id)).toBe(0);
    expect(await eventosDeAtivacaoNoOutbox(id)).toBe(0);
  });

  it('o e-mail do convite casa sem diferenciar maiúsculas', async () => {
    const { token } = await convidar(EMAIL_DA_MARIA);
    conferidor.emails.set(SUJEITO_DA_MARIA, 'MARIA@Casa.ORG');

    expect((await ativar(SUJEITO_DA_MARIA, token)).status).toBe(200);
  });

  it('provedor indisponível: 503 PROVEDOR_DE_IDENTIDADE_INDISPONIVEL e o convite segue pendente', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    conferidor.indisponivel = true;

    const resposta = await ativar(SUJEITO_DA_MARIA, token);

    expect(resposta.status).toBe(503);
    expect(resposta.corpo.erro).toBe('PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
    expect(await estadoNoBanco(id)).toMatchObject({ situacao: 'CONVITE_PENDENTE', subject_id: null });

    conferidor.indisponivel = false;
    expect((await ativar(SUJEITO_DA_MARIA, token)).status).toBe(200);
  });

  it('convite expirado: 410 CONVITE_EXPIRADO sem consultar o provedor', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    aplicacao.relogio.avancarEmMs(HORAS_DO_CONVITE * MILISSEGUNDOS_POR_HORA + 1);

    const resposta = await ativar(SUJEITO_DA_MARIA, token);

    expect(resposta.status).toBe(410);
    expect(resposta.corpo.erro).toBe('CONVITE_EXPIRADO');
    expect(conferidor.consultados).toEqual([]);
    expect((await estadoNoBanco(id)).situacao).toBe('CONVITE_PENDENTE');
  });

  it('no último instante da validade ainda ativa', async () => {
    const { token } = await convidar(EMAIL_DA_MARIA);
    aplicacao.relogio.avancarEmMs(HORAS_DO_CONVITE * MILISSEGUNDOS_POR_HORA);

    expect((await ativar(SUJEITO_DA_MARIA, token)).status).toBe(200);
  });

  it('convite revogado pelo reenvio não ativa e o novo ativa', async () => {
    const { id, token: tokenAntigo } = await convidar(EMAIL_DA_MARIA);
    const tokenNovoDoReenvio = tokenNovo();
    aplicacao.relogio.avancarEmMs(INTERVALO_DE_REENVIO_EM_MS);
    await comContexto(INSTITUICAO_A, async () => {
      const usuario = (await aplicacao.usuarios.porId(id))!;
      const agora = aplicacao.relogio.agora();
      usuario.reenviarConvite(
        sha256Hex(tokenNovoDoReenvio),
        new Date(agora.getTime() + HORAS_DO_CONVITE * MILISSEGUNDOS_POR_HORA),
        AUTOR,
        agora,
      );
      await aplicacao.usuarios.salvar(usuario);
    });
    expect((await convitesDoUsuario(banco, INSTITUICAO_A, id)).map(({ revogado }) => revogado)).toEqual([true, false]);

    const antigo = await ativar(SUJEITO_DA_MARIA, tokenAntigo);

    expect(antigo.status).toBe(400);
    expect(antigo.corpo.erro).toBe('CONVITE_INVALIDO');
    expect(conferidor.consultados).toEqual([]);
    expect((await estadoNoBanco(id)).situacao).toBe('CONVITE_PENDENTE');
    expect((await ativar(SUJEITO_DA_MARIA, tokenNovoDoReenvio)).status).toBe(200);
  });

  it.each([
    ['na mesma casa', INSTITUICAO_A],
    ['em outra casa', INSTITUICAO_B],
  ] as const)('mesmo sub em dois usuários %s: 409 SUJEITO_JA_VINCULADO e o segundo convite segue pendente', async (_descricao, outraCasa) => {
    const emailDoSegundo = 'maria2@casa.org';
    const primeiro = await convidar(EMAIL_DA_MARIA);
    const segundo = await convidar(emailDoSegundo, outraCasa);
    expect((await ativar(SUJEITO_DA_MARIA, primeiro.token)).status).toBe(200);
    conferidor.emails.set(SUJEITO_DA_MARIA, emailDoSegundo);

    const resposta = await ativar(SUJEITO_DA_MARIA, segundo.token);

    expect(resposta.status).toBe(409);
    expect(resposta.corpo.erro).toBe('SUJEITO_JA_VINCULADO');
    expect(await estadoNoBanco(segundo.id, outraCasa)).toMatchObject({ situacao: 'CONVITE_PENDENTE', subject_id: null, versao: 1 });
    expect(await conviteUsadoEm(segundo.id, outraCasa)).toBeNull();
    expect(await trilhaDeAtivacao(segundo.id, outraCasa)).toBe(0);
    expect(await eventosDeAtivacaoNoOutbox(segundo.id)).toBe(0);
  });

  it('usuário suspenso depois de ativar: 401 USUARIO_SUSPENSO, mesmo repetindo o convite do mesmo sub', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    await ativar(SUJEITO_DA_MARIA, token);
    await comContexto(INSTITUICAO_A, async () => {
      const usuario = (await aplicacao.usuarios.porId(id))!;
      usuario.desativar(AUTOR, 'afastamento', aplicacao.relogio.agora());
      await aplicacao.usuarios.salvar(usuario);
    });

    const resposta = await ativar(SUJEITO_DA_MARIA, token);

    expect(resposta.status).toBe(401);
    expect(resposta.corpo.erro).toBe('USUARIO_SUSPENSO');
  });

  it('duas ativações simultâneas do mesmo convite e sub: nunca 500, a perdedora é 200 idempotente ou 409 VERSAO_DESATUALIZADA, com uma única gravação', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    conferidor.segurarAte(2);

    const respostas = await Promise.all([ativar(SUJEITO_DA_MARIA, token), ativar(SUJEITO_DA_MARIA, token)]);

    for (const { status, corpo } of respostas) {
      expect(status === 200 || status === 409).toBe(true);
      if (status === 409) expect(corpo.erro).toBe('VERSAO_DESATUALIZADA');
    }
    expect(respostas.some(({ status }) => status === 200)).toBe(true);
    expect(await estadoNoBanco(id)).toMatchObject({ situacao: 'ATIVO', subject_id: SUJEITO_DA_MARIA, versao: 2 });
    expect(await trilhaDeAtivacao(id)).toBe(1);
    expect(await eventosDeAtivacaoNoOutbox(id)).toBe(1);
    expect(conferidor.consultados).toEqual([SUJEITO_DA_MARIA, SUJEITO_DA_MARIA]);
  });

  it('duas ativações simultâneas de subs diferentes pelo mesmo convite: só uma vence e o vínculo é de quem venceu', async () => {
    const { id, token } = await convidar(EMAIL_DA_MARIA);
    conferidor.emails.set(SUJEITO_DO_JOAO, EMAIL_DA_MARIA);
    conferidor.segurarAte(2);

    const respostas = await Promise.all([ativar(SUJEITO_DA_MARIA, token), ativar(SUJEITO_DO_JOAO, token)]);

    expect(respostas.map(({ status }) => status).toSorted()).toEqual([200, 409]);
    const vencedor = respostas[0]!.status === 200 ? SUJEITO_DA_MARIA : SUJEITO_DO_JOAO;
    expect((await estadoNoBanco(id)).subject_id).toBe(vencedor);
    expect(await trilhaDeAtivacao(id)).toBe(1);
  });
});
