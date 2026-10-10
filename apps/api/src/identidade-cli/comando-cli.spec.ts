import { describe, expect, it } from 'vitest';
import { analisarComandoDaIdentidade, ErroDeUsoDoCli } from './comando-cli.js';

const ARGUMENTOS_VALIDOS = [
  'bootstrap',
  '--instituicao-nome',
  'Casa do Despertar',
  '--admin-nome',
  'Ana Souza',
  '--admin-email',
  'ana@casa.org',
];

function problemasDe(argumentos: readonly string[]): readonly string[] {
  try {
    analisarComandoDaIdentidade(argumentos);
  } catch (erro) {
    if (erro instanceof ErroDeUsoDoCli) return erro.problemas;
    throw erro;
  }
  throw new Error('o parser deveria ter recusado');
}

describe('analisarComandoDaIdentidade', () => {
  it('lê as três flags obrigatórias no modo convite', () => {
    expect(analisarComandoDaIdentidade(ARGUMENTOS_VALIDOS)).toEqual({
      subcomando: 'bootstrap',
      bootstrap: { instituicaoNome: 'Casa do Despertar', adminNome: 'Ana Souza', adminEmail: 'ana@casa.org' },
    });
  });

  it('aceita a forma --flag=valor e o --sujeito opcional', () => {
    const comando = analisarComandoDaIdentidade([
      'bootstrap',
      '--instituicao-nome=Casa',
      '--admin-nome=Ana',
      '--admin-email=ana@casa.org',
      '--sujeito=abc-123',
    ]);

    expect(comando).toEqual({
      subcomando: 'bootstrap',
      bootstrap: { instituicaoNome: 'Casa', adminNome: 'Ana', adminEmail: 'ana@casa.org', sujeito: 'abc-123' },
    });
  });

  it('aparar e normalizar: nomes sem espaços nas pontas e e-mail em minúsculas', () => {
    const comando = analisarComandoDaIdentidade([
      'bootstrap',
      '--instituicao-nome',
      '  Casa  ',
      '--admin-nome',
      ' Ana ',
      '--admin-email',
      '  ANA@Casa.ORG ',
    ]);

    expect(comando).toEqual({
      subcomando: 'bootstrap',
      bootstrap: { instituicaoNome: 'Casa', adminNome: 'Ana', adminEmail: 'ana@casa.org' },
    });
  });

  it.each([[[]], [['migrar']], [['--instituicao-nome', 'X']]])('recusa subcomando ausente ou desconhecido: %j', (argumentos) => {
    expect(problemasDe(argumentos)[0]).toMatch(/Subcomando ausente ou inválido/);
  });

  it('recusa flag desconhecida sem ecoar o valor', () => {
    const problemas = problemasDe([...ARGUMENTOS_VALIDOS, '--senha=segredo-que-nao-pode-aparecer']);

    expect(problemas).toEqual([
      'Flag desconhecida; use apenas: --instituicao-nome, --admin-nome, --admin-email, --sujeito.',
    ]);
    expect(problemas.join('')).not.toContain('senha');
  });

  it('recusa flag repetida', () => {
    expect(problemasDe([...ARGUMENTOS_VALIDOS, '--admin-nome', 'Outra'])).toEqual(['Flag repetida: --admin-nome.']);
  });

  it.each([
    [['--instituicao-nome', '   ']],
    [['--instituicao-nome', '']],
    [['--instituicao-nome=']],
    [['--instituicao-nome']],
    [['--instituicao-nome', '--sujeito', 'x']],
  ])('recusa flag vazia: %j', (trecho) => {
    const problemas = problemasDe(['bootstrap', '--admin-nome', 'Ana', '--admin-email', 'ana@casa.org', ...trecho]);

    expect(problemas).toEqual(['Flag vazia: --instituicao-nome.']);
  });

  it('recusa nome de instituição acima de 200 caracteres', () => {
    const nomeLongo = 'a'.repeat(201);
    const argumentos = ARGUMENTOS_VALIDOS.map((argumento) => (argumento === 'Casa do Despertar' ? nomeLongo : argumento));

    expect(problemasDe(argumentos)).toEqual(['--instituicao-nome: informe um nome de até 200 caracteres.']);
  });

  it('recusa --sujeito vazio', () => {
    expect(problemasDe([...ARGUMENTOS_VALIDOS, '--sujeito', '  '])).toEqual(['Flag vazia: --sujeito.']);
  });

  it('recusa argumento posicional', () => {
    expect(problemasDe([...ARGUMENTOS_VALIDOS, 'sobrando'])).toEqual([
      'Argumento posicional não é aceito; use flags explícitas.',
    ]);
  });

  it.each(['--instituicao-nome', '--admin-nome', '--admin-email'])('recusa a ausência de %s', (flag) => {
    const posicao = ARGUMENTOS_VALIDOS.indexOf(flag);
    const semAFlag = ARGUMENTOS_VALIDOS.filter((_, indice) => indice !== posicao && indice !== posicao + 1);

    expect(problemasDe(semAFlag)).toEqual([`Flag obrigatória ausente: ${flag}.`]);
  });

  it.each(['ana', 'ana@', '@casa.org', 'ana casa@x.org', 'ana@casa'])('recusa e-mail inválido: %s', (email) => {
    const argumentos = ARGUMENTOS_VALIDOS.map((argumento) => (argumento === 'ana@casa.org' ? email : argumento));

    expect(problemasDe(argumentos)).toEqual(['--admin-email: informe um e-mail válido.']);
  });

  describe('seed-demo', () => {
    it('aceita o subcomando sem flags', () => {
      expect(analisarComandoDaIdentidade(['seed-demo'])).toEqual({ subcomando: 'seed-demo' });
    });

    it.each([[['seed-demo', '--admin-email', 'ana@casa.org']], [['seed-demo', '--sujeito=abc']], [['seed-demo', 'extra']]])(
      'recusa qualquer flag ou argumento: %j',
      (argumentos) => {
        expect(() => analisarComandoDaIdentidade(argumentos)).toThrow(ErroDeUsoDoCli);
      },
    );
  });
});
