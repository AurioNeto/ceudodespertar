import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ArgumentMetadata } from '@nestjs/common';
import { AlterarGruposDoUsuario, ConvidarUsuario, FiltroDeAuditoria, FiltroDeUsuarios, RenomearGrupo } from '@cdd/contracts';
import { ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import type { DetalhesDeCorpoInvalido } from '../../kernel/problemas-de-validacao.js';
import { PipeDeValidacaoZod } from './pipe-de-validacao-zod.js';

const ESQUEMA_COM_TODAS_AS_REGRAS = z
  .object({
    nome: z.string().trim().min(1).max(5),
    email: z.string().pipe(z.email()),
    situacao: z.enum(['ATIVO']),
    quantidade: z.number().multipleOf(5),
    idade: z.number(),
    escolha: z.union([z.literal('a'), z.number()]),
    codigo: z.string().refine((valor) => valor !== 'x', { params: { regra: 'codigo_reservado' } }),
    livre: z.string().refine((valor) => valor !== 'x', { message: 'Invalid input: not x' }),
  })
  .strict();

const ESQUEMA_DE_LISTA = z.object({ itens: z.array(z.string()) });
const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const REGRA_EM_CODIGO = /^[a-z][a-z_]*$/;
const CAMINHO_TECNICO = /^[A-Za-z0-9_.]*$/;

function metadadoDe(schema: unknown): ArgumentMetadata {
  return { type: 'body', metatype: undefined, data: undefined, schema } as unknown as ArgumentMetadata;
}

async function detalhesDaRecusa(schema: unknown, valor: unknown): Promise<DetalhesDeCorpoInvalido> {
  try {
    await new PipeDeValidacaoZod().transform(valor, metadadoDe(schema));
  } catch (excecao) {
    const erro = (excecao as ErroDeDominioException).erroDeDominio;
    expect(erro.codigo).toBe('CORPO_INVALIDO');
    return erro.detalhes as DetalhesDeCorpoInvalido;
  }
  throw new Error('o pipe aceitou um valor inválido');
}

describe('PipeDeValidacaoZod', () => {
  it('devolve o valor transformado quando o corpo é válido', async () => {
    const resultado = await new PipeDeValidacaoZod().transform({ nome: ' Casa ' }, metadadoDe(z.object({ nome: z.string().trim() })));

    expect(resultado).toStrictEqual({ nome: 'Casa' });
  });

  it('lança ErroDeDominioException com CORPO_INVALIDO quando o corpo é inválido', async () => {
    await expect(
      new PipeDeValidacaoZod().transform({ nome: '' }, metadadoDe(z.object({ nome: z.string().min(1) }))),
    ).rejects.toThrow(ErroDeDominioException);
  });

  it('cada problema traz só o caminho e um código estável da regra, sem a mensagem do Zod', async () => {
    const detalhes = await detalhesDaRecusa(ESQUEMA_COM_TODAS_AS_REGRAS, {
      nome: 'nome longo demais',
      email: 'sem-arroba',
      situacao: 'OUTRA',
      quantidade: 7,
      idade: 'trinta',
      escolha: true,
      codigo: 'x',
      livre: 'x',
      campoExtra: 'fulana@exemplo.com',
    });

    expect(detalhes).toStrictEqual({
      problemas: [
        { caminho: 'nome', regra: 'maximo' },
        { caminho: 'email', regra: 'formato' },
        { caminho: 'situacao', regra: 'valor' },
        { caminho: 'quantidade', regra: 'multiplo' },
        { caminho: 'idade', regra: 'tipo' },
        { caminho: 'escolha', regra: 'formato' },
        { caminho: 'codigo', regra: 'codigo_reservado' },
        { caminho: 'livre', regra: 'invalido' },
        { caminho: '', regra: 'campo_desconhecido' },
      ],
      total: 9,
    });
  });

  it('campo ausente é obrigatorio; campo presente com tipo errado é tipo', async () => {
    const esquema = z.object({ nome: z.string(), endereco: z.object({ cidade: z.string() }), apelido: z.string() });

    const detalhes = await detalhesDaRecusa(esquema, { endereco: {}, apelido: null });

    expect(detalhes.problemas).toStrictEqual([
      { caminho: 'nome', regra: 'obrigatorio' },
      { caminho: 'endereco.cidade', regra: 'obrigatorio' },
      { caminho: 'apelido', regra: 'tipo' },
    ]);
  });

  it('texto vazio depois do trim é minimo, e não obrigatorio', async () => {
    const detalhes = await detalhesDaRecusa(z.object({ nome: z.string().trim().min(1) }), { nome: '   ' });

    expect(detalhes.problemas).toStrictEqual([{ caminho: 'nome', regra: 'minimo' }]);
  });

  it('segmento de caminho que não é identificador, como chave de record, sai mascarado', async () => {
    const esquema = z.object({ contatos: z.record(z.string(), z.object({ nome: z.string() })) });

    const detalhes = await detalhesDaRecusa(esquema, { contatos: { 'fulana@exemplo.com': {}, nome_ok: {} } });

    expect(detalhes.problemas).toStrictEqual([
      { caminho: 'contatos.*.nome', regra: 'obrigatorio' },
      { caminho: 'contatos.nome_ok.nome', regra: 'obrigatorio' },
    ]);
    expect(JSON.stringify(detalhes)).not.toContain('fulana');
  });

  it('regra própria fora do formato de código vira invalido', async () => {
    const esquema = z.object({ a: z.string().refine(() => false, { params: { regra: 'Regra Com Frase' } }) });

    const detalhes = await detalhesDaRecusa(esquema, { a: 'x' });

    expect(detalhes.problemas).toStrictEqual([{ caminho: 'a', regra: 'invalido' }]);
  });

  it('regras próprias do contrato saem com o código delas', async () => {
    const recusas = await Promise.all([
      detalhesDaRecusa(ConvidarUsuario, { nome: 'a\u0000', email: 'a@b.org' }),
      detalhesDaRecusa(AlterarGruposDoUsuario, { grupos: [UUID, UUID.toUpperCase()] }),
      detalhesDaRecusa(FiltroDeAuditoria, { de: '2026-10-02T00:00:00Z', ate: '2026-10-01T00:00:00Z' }),
    ]);

    expect(recusas.map(({ problemas }) => problemas)).toStrictEqual([
      [{ caminho: 'nome', regra: 'sem_caractere_nulo' }],
      [{ caminho: 'grupos', regra: 'sem_duplicados' }],
      [{ caminho: 'de', regra: 'intervalo_invertido' }],
    ]);
  });

  it('CORPO_INVALIDO não contém texto em linguagem natural nem ecoa o valor recebido', async () => {
    const recusas = await Promise.all([
      detalhesDaRecusa(ESQUEMA_COM_TODAS_AS_REGRAS, { nome: 'fulana@exemplo.com', extra: 'cpf 123.456.789-00' }),
      detalhesDaRecusa(ConvidarUsuario, { nome: '', email: 'fulana sem arroba' }),
      detalhesDaRecusa(FiltroDeUsuarios, { limite: 'muitos', busca: '' }),
      detalhesDaRecusa(RenomearGrupo, {}),
    ]);

    for (const { problemas } of recusas) {
      expect(problemas.length).toBeGreaterThan(0);
      for (const problema of problemas) {
        expect(Object.keys(problema).toSorted()).toStrictEqual(['caminho', 'regra']);
        expect(problema.regra).toMatch(REGRA_EM_CODIGO);
        expect(problema.caminho).toMatch(CAMINHO_TECNICO);
      }
    }
    const texto = JSON.stringify(recusas);
    expect(texto).not.toMatch(/\s/);
    expect(texto).not.toContain('fulana');
    expect(texto).not.toContain('123.456');
  });

  it('limita a 20 problemas reportados e informa o total, mesmo com milhares de itens inválidos', async () => {
    const detalhes = await detalhesDaRecusa(ESQUEMA_DE_LISTA, { itens: Array(20000).fill(1) });

    expect(detalhes.problemas).toHaveLength(20);
    expect(detalhes.problemas[0]).toStrictEqual({ caminho: 'itens.0', regra: 'tipo' });
    expect(detalhes.total).toBe(20000);
    expect(JSON.stringify(detalhes).length).toBeLessThan(5000);
  });
});
