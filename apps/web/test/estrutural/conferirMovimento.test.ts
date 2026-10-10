import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  arquivoNovoSemOrigem,
  CODIGO_DE_FALHA,
  CODIGO_DE_SUCESSO,
  codigo,
  criarRepositorio,
  emSrc,
  executarCenario,
  executarGit,
  executarVerificador,
  removerRepositoriosCriados,
  renomeacaoComDiferenca,
  renomeacaoConferida,
  type Repositorio,
  TEMPO_DO_CENARIO_EM_MS,
  trocar,
} from './apoioDoConferirMovimento';

const SOMA = codigo('export const soma = (a: number, b: number): number => a + b;');

const CALCULO = codigo(
  "import { soma } from './soma';",
  '',
  'export function dobro(valor: number): number {',
  '  return soma(valor, valor);',
  '}',
);

const CALCULO_COM_IMPORT_NOVO = CALCULO.replace("'./soma'", "'../soma'");

const CALCULO_COM_CORPO_TROCADO = CALCULO_COM_IMPORT_NOVO.replace('soma(valor, valor)', 'soma(valor, 1)');

const CONSUMIDOR = codigo(
  "import { dobro } from './calculo';",
  '',
  'export const quadruplo = (valor: number): number => dobro(dobro(valor));',
);

const CONSUMIDOR_COM_IMPORT_NOVO = CONSUMIDOR.replace("'./calculo'", "'./matematica/calculo'");

const CONSTANTES_DOS_UTILITARIOS = [
  'export const LIMITE = 10;',
  'export const MINIMO = 1;',
  'export const PADRAO = 5;',
  'export const ROTULO = "utilitarios";',
];

const UTILITARIOS = codigo(
  "import { soma } from './soma';",
  '',
  ...CONSTANTES_DOS_UTILITARIOS,
  '',
  'export function somar(a: number, b: number): number {',
  '  return soma(a, b);',
  '}',
);

const UTILITARIOS_SEM_SOMAR = codigo(...CONSTANTES_DOS_UTILITARIOS);

const SOMAR_EM_ARQUIVO_PROPRIO = codigo(
  "import { soma } from './soma';",
  '',
  'export function somar(a: number, b: number): number {',
  '  return soma(a, b);',
  '}',
);

const SOMAR_EM_OUTRA_PASTA = SOMAR_EM_ARQUIVO_PROPRIO.replace("'./soma'", "'../soma'");

const ESTADOS = codigo(
  "export const Alfa = (): string => 'alfa';",
  "export const Beta = (): string => 'beta';",
);

const ALFA = codigo("export const Alfa = (): string => 'alfa';");

const BETA = codigo("export const Beta = (): string => 'beta';");

const TESTE_DE_ESTADOS = codigo(
  "import { afterEach, describe, expect, it } from 'vitest';",
  "import { Alfa, Beta } from './estados';",
  '',
  'afterEach(() => undefined);',
  '',
  'const raizDe = (valor: string): string => valor.trim();',
  '',
  "describe('Alfa', () => {",
  "  it('mostra o texto', () => {",
  "    expect(raizDe(Alfa())).toBe('alfa');",
  '  });',
  '});',
  '',
  "describe('Beta', () => {",
  "  it('mostra o texto', () => {",
  "    expect(raizDe(Beta())).toBe('beta');",
  '  });',
  '});',
);

const CABECALHO_DO_TESTE_REPARTIDO = (componente: string): string[] => [
  "import { afterEach, describe, expect, it } from 'vitest';",
  `import { ${componente} } from './${componente}';`,
  '',
  'afterEach(() => undefined);',
  '',
  'const raizDe = (valor: string): string => valor.trim();',
  '',
];

const DESCRIBE_DE = (componente: string, esperado: string): string[] => [
  `describe('${componente}', () => {`,
  "  it('mostra o texto', () => {",
  `    expect(raizDe(${componente}())).toBe('${esperado}');`,
  '  });',
  '});',
];

const TESTE_DA_ALFA = codigo(...CABECALHO_DO_TESTE_REPARTIDO('Alfa'), ...DESCRIBE_DE('Alfa', 'alfa'));

const TESTE_DA_BETA = codigo(...CABECALHO_DO_TESTE_REPARTIDO('Beta'), ...DESCRIBE_DE('Beta', 'beta'));

const TESTE_DA_BETA_COM_CORPO_TROCADO = codigo(
  ...CABECALHO_DO_TESTE_REPARTIDO('Beta'),
  ...DESCRIBE_DE('Beta', 'outro'),
);

const BARREL_DO_CALCULO = codigo("export { dobro } from './calculo';");

const CSS_DA_MARCA = codigo(
  ':root {',
  '  --cor-primaria: #1a3a5c;',
  '  --cor-secundaria: #c8a24a;',
  '  --raio: 8px;',
  '  --espaco: 16px;',
  '}',
);

const COM_LISTA_DE_EXPORTACAO = codigo(
  'const a = 1;',
  'const b = 2;',
  '',
  'export const soma = a + b;',
  'export { a, b };',
);

const COM_NOTA_FINAL = codigo('export const a = 1;', 'export const b = 2;', '', "// nota final");

const COM_TIPO_IMPORTADO = codigo(
  "export type Entrada = import('../tipos').Tipo;",
  '',
  'export const rotulo = "tela";',
  'export const largura = 320;',
  'export const altura = 480;',
);

const DOBRO = codigo('export const dobro = (valor: number): number => valor * 2;');

const UTILITARIOS_COM_NOTA_NO_CORPO = UTILITARIOS.replace(
  'return soma(a, b);',
  'return soma(a, b); // soma simples',
);

const SOMAR_COM_NOTA_NO_CORPO = SOMAR_EM_ARQUIVO_PROPRIO.replace(
  'return soma(a, b);',
  'return soma(a, b); // soma simples',
);

afterEach(removerRepositoriosCriados);

describe('conferir-movimento', { timeout: TEMPO_DO_CENARIO_EM_MS }, () => {
  describe('renomeações', () => {
    it('passa quando o arquivo só muda de lugar', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.mover('soma.ts', 'matematica/soma.ts'),
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(renomeacaoConferida('soma.ts', 'matematica/soma.ts'));
    });

    it('passa quando o arquivo muda de lugar e troca só a linha de import, e o consumidor também', () => {
      const resultado = executarCenario({
        base: { 'calculo.ts': CALCULO, 'soma.ts': SOMA, 'consumidor.ts': CONSUMIDOR },
        depois: (repositorio) => {
          repositorio.mover('calculo.ts', 'matematica/calculo.ts');
          repositorio.escrever({
            'matematica/calculo.ts': CALCULO_COM_IMPORT_NOVO,
            'consumidor.ts': CONSUMIDOR_COM_IMPORT_NOVO,
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(renomeacaoConferida('calculo.ts', 'matematica/calculo.ts'));
    });

    it('falha quando o arquivo muda de lugar e uma linha do corpo muda', () => {
      const resultado = executarCenario({
        base: { 'calculo.ts': CALCULO, 'soma.ts': SOMA },
        depois: (repositorio) => {
          repositorio.mover('calculo.ts', 'matematica/calculo.ts');
          repositorio.escrever({ 'matematica/calculo.ts': CALCULO_COM_CORPO_TROCADO });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('corpo mudou: dobro');
      expect(resultado.erro).toContain(emSrc('matematica/calculo.ts'));
    });

    it('falha quando o arquivo renomeado só ganha o modificador export, sem repartição', () => {
      const base = codigo('const auxiliar = 1;', '', 'export const principal = auxiliar;');
      const resultado = executarCenario({
        base: { 'tudo.ts': base },
        depois: (repositorio) => {
          repositorio.mover('tudo.ts', 'pasta/tudo.ts');
          repositorio.escrever({
            'pasta/tudo.ts': base.replace('const auxiliar', 'export const auxiliar'),
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(renomeacaoComDiferenca('tudo.ts', 'pasta/tudo.ts'));
    });

    it('passa quando o arquivo que o git renomeia perde só a declaração que foi repartida', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => {
          repositorio.mover('utilitarios.ts', 'grupo/utilitarios.ts');
          repositorio.escrever({
            'grupo/utilitarios.ts': UTILITARIOS_SEM_SOMAR,
            'grupo/somar.ts': SOMAR_EM_OUTRA_PASTA,
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(renomeacaoConferida('utilitarios.ts', 'grupo/utilitarios.ts'));
      expect(resultado.saida).toContain(`${emSrc('utilitarios.ts')} -> ${emSrc('grupo/somar.ts')}: somar`);
    });

    it('passa quando o caminho de um vi.mock e de um import() dinâmico muda', () => {
      const antes = codigo(
        "import { vi } from 'vitest';",
        '',
        "vi.mock('../a', () => ({ valor: 1 }));",
        '',
        "export const carregar = () => import('../b');",
      );
      const depois = antes.replace("'../a'", "'../../a'").replace("'../b'", "'../../b'");
      const resultado = executarCenario({
        base: { 'tela.ts': antes },
        depois: (repositorio) => {
          repositorio.mover('tela.ts', 'pasta/tela.ts');
          repositorio.escrever({ 'pasta/tela.ts': depois });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
    });

    it('trata uma declaração de variáveis com vários declaradores como uma só', () => {
      const resultado = executarCenario({
        base: { 'tudo.ts': codigo('export const A = 1, B = 2;', '', 'export const C = 3;') },
        depois: (repositorio) => repositorio.escrever({ 'tudo.ts': codigo('export const C = 3;') }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração perdida: A, B (${emSrc('tudo.ts')})`);
    });

    it('passa quando um arquivo que não é código só muda de lugar e falha quando é apagado', () => {
      const base = { 'estilos/marca.css': ':root { --cor: red; }\n', 'soma.ts': SOMA };
      const movido = executarCenario({
        base,
        depois: (repositorio) => repositorio.mover('estilos/marca.css', 'marca.css'),
      });
      const apagado = executarCenario({
        base,
        depois: (repositorio) => repositorio.apagar('estilos/marca.css'),
      });

      expect(movido.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(apagado.codigo).toBe(CODIGO_DE_FALHA);
      expect(apagado.erro).toContain(emSrc('estilos/marca.css'));
    });

    it('falha quando um arquivo que não é código muda de lugar e de conteúdo', () => {
      const resultado = executarCenario({
        base: { 'estilos/marca.css': CSS_DA_MARCA },
        depois: (repositorio) => {
          repositorio.mover('estilos/marca.css', 'marca.css');
          repositorio.escrever({ 'marca.css': CSS_DA_MARCA.replace('#1a3a5c', '#1a3a5d') });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(renomeacaoComDiferenca('estilos/marca.css', 'marca.css'));
    });

    it('falha quando o arquivo renomeado perde uma lista local de export', () => {
      const resultado = executarCenario({
        base: { 'tudo.ts': COM_LISTA_DE_EXPORTACAO },
        depois: (repositorio) => {
          repositorio.mover('tudo.ts', 'pasta/tudo.ts');
          repositorio.escrever({
            'pasta/tudo.ts': COM_LISTA_DE_EXPORTACAO.replace('export { a, b };\n', ''),
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração perdida: export { a, b }; (${emSrc('tudo.ts')})`);
    });

    it('falha quando o arquivo renomeado só muda o texto depois da última declaração', () => {
      const resultado = executarCenario({
        base: { 'tudo.ts': COM_NOTA_FINAL },
        depois: (repositorio) => {
          repositorio.mover('tudo.ts', 'pasta/tudo.ts');
          repositorio.escrever({ 'pasta/tudo.ts': COM_NOTA_FINAL.replace('final', 'outra') });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(renomeacaoComDiferenca('tudo.ts', 'pasta/tudo.ts'));
    });

    it('passa quando só o caminho de um import() dentro de um tipo muda', () => {
      const resultado = executarCenario({
        base: { 'a/tela.ts': COM_TIPO_IMPORTADO, 'tipos.ts': codigo('export type Tipo = string;') },
        depois: (repositorio) => {
          repositorio.mover('a/tela.ts', 'a/b/tela.ts');
          repositorio.escrever({
            'a/b/tela.ts': COM_TIPO_IMPORTADO.replace("'../tipos'", "'../../tipos'"),
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
    });
  });

  describe('declarações repartidas', () => {
    it('passa quando a declaração muda de arquivo com o corpo idêntico', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => {
          repositorio.escrever({
            'utilitarios.ts': UTILITARIOS_SEM_SOMAR,
            'somar.ts': SOMAR_EM_ARQUIVO_PROPRIO,
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(`${emSrc('utilitarios.ts')} -> ${emSrc('somar.ts')}: somar`);
    });

    it('falha quando a declaração muda de arquivo e o corpo muda', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => {
          repositorio.escrever({
            'utilitarios.ts': UTILITARIOS_SEM_SOMAR,
            'somar.ts': SOMAR_EM_ARQUIVO_PROPRIO.replace('soma(a, b)', 'soma(b, a)'),
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('corpo mudou: somar');
    });

    it('falha quando uma declaração some', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => repositorio.escrever({ 'utilitarios.ts': UTILITARIOS_SEM_SOMAR }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração perdida: somar (${emSrc('utilitarios.ts')})`);
    });

    it('falha quando o HEAD ganha uma declaração que a base não tem', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) =>
          repositorio.escrever({ 'utilitarios.ts': `${UTILITARIOS}\nexport const NOVA = 1;\n` }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração nova: NOVA (${emSrc('utilitarios.ts')})`);
    });

    it('falha quando a declaração é copiada para outro arquivo e continua no original', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => repositorio.escrever({ 'somar.ts': SOMAR_EM_ARQUIVO_PROPRIO }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('somar.ts', 'somar'));
    });

    it('não conta o modificador export no hash do corpo quando outro arquivo importa a declaração', () => {
      const principal = 'export const principal = auxiliar(1);';
      const resultado = executarCenario({
        base: {
          'tudo.ts': codigo(
            'const auxiliar = (valor: number): number => valor + 1;',
            '',
            principal,
          ),
        },
        depois: (repositorio) =>
          repositorio.escrever({
            'tudo.ts': codigo("import { auxiliar } from './auxiliar';", '', principal),
            'auxiliar.ts': codigo('export const auxiliar = (valor: number): number => valor + 1;'),
          }),
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
    });

    it('falha quando a declaração de produção vai para dois arquivos novos e o original some', () => {
      const resto = codigo(
        'export const triplo = (valor: number): number => valor * 3;',
        'export const quadruplo = (valor: number): number => valor * 4;',
      );
      const resultado = executarCenario({
        base: { 'util.ts': codigo(DOBRO.trim(), '', resto.trim()) },
        depois: (repositorio) => {
          repositorio.apagar('util.ts');
          repositorio.escrever({ 'a/dobro.ts': DOBRO, 'b/dobro.ts': DOBRO, 'c/resto.ts': resto });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('b/dobro.ts', 'dobro'));
    });

    it('falha quando o comentário dentro do corpo da declaração repartida muda', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS_COM_NOTA_NO_CORPO },
        depois: (repositorio) => {
          repositorio.escrever({
            'utilitarios.ts': UTILITARIOS_SEM_SOMAR,
            'somar.ts': SOMAR_COM_NOTA_NO_CORPO.replace('simples', 'direta'),
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('corpo mudou: somar');
    });

    it('passa quando o comentário dentro do corpo da declaração repartida é o mesmo', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS_COM_NOTA_NO_CORPO },
        depois: (repositorio) => {
          repositorio.escrever({
            'utilitarios.ts': UTILITARIOS_SEM_SOMAR,
            'somar.ts': SOMAR_COM_NOTA_NO_CORPO,
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
    });
  });

  describe('testes repartidos por describe', () => {
    const base = { 'estados.ts': ESTADOS, 'estados.dom.test.ts': TESTE_DE_ESTADOS };
    const repartirOsEstados = (repositorio: Repositorio, testes: Record<string, string>): void => {
      repositorio.apagar('estados.ts');
      repositorio.apagar('estados.dom.test.ts');
      repositorio.escrever({ 'Alfa/Alfa.ts': ALFA, 'Beta/Beta.ts': BETA, ...testes });
    };

    it('passa com o describe repartido de título igual e o ajudante repetido idêntico', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          repartirOsEstados(repositorio, {
            'Alfa/Alfa.dom.test.ts': TESTE_DA_ALFA,
            'Beta/Beta.dom.test.ts': TESTE_DA_BETA,
          }),
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain('describe("Beta")');
    });

    it('falha quando o corpo de um describe repartido muda', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          repartirOsEstados(repositorio, {
            'Alfa/Alfa.dom.test.ts': TESTE_DA_ALFA,
            'Beta/Beta.dom.test.ts': TESTE_DA_BETA_COM_CORPO_TROCADO,
          }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('corpo mudou: describe("Beta")');
    });

    it('falha quando um describe aparece em dois arquivos novos', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          repartirOsEstados(repositorio, {
            'Alfa/Alfa.dom.test.ts': TESTE_DA_ALFA,
            'Beta/Beta.dom.test.ts': TESTE_DA_BETA,
            'Copia/Copia.dom.test.ts': TESTE_DA_BETA,
          }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('declaração nova: describe("Beta")');
    });

    it('falha quando o ajudante de teste repartido muda em um dos arquivos', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          repartirOsEstados(repositorio, {
            'Alfa/Alfa.dom.test.ts': TESTE_DA_ALFA,
            'Beta/Beta.dom.test.ts': TESTE_DA_BETA.replace('valor.trim()', 'valor.trimEnd()'),
          }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('raizDe');
    });

    it('falha quando o teste ganha a cópia de uma declaração de produção', () => {
      const producao = codigo(
        "import { base } from './base';",
        '',
        'export const outra = (valor: number): number => valor * 2;',
        'export const maior = base + 1;',
      );
      const teste = codigo(
        "import { describe, expect, it } from 'vitest';",
        '',
        "describe('soma', () => {",
        "  it('confere', () => {",
        '    expect(1).toBe(1);',
        '  });',
        '});',
      );
      const resultado = executarCenario({
        base: { 'base.ts': codigo('export const base = 1;'), 'soma.ts': producao, 'soma.dom.test.ts': teste },
        depois: (repositorio) => {
          repositorio.mover('base.ts', 'lib/base.ts');
          repositorio.escrever({
            'soma.ts': trocar(producao, "'./base'", "'./lib/base'"),
            'soma.dom.test.ts': `const outra = (valor: number): number => valor * 2;\n\n${teste}`,
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração nova: outra (${emSrc('soma.dom.test.ts')})`);
    });
  });

  describe('barrels e arquivos novos', () => {
    it('passa com um index.ts novo só com export ... from', () => {
      const resultado = executarCenario({
        base: { 'calculo.ts': CALCULO, 'soma.ts': SOMA },
        depois: (repositorio) => {
          repositorio.mover('calculo.ts', 'Calculo/calculo.ts');
          repositorio.escrever({
            'Calculo/calculo.ts': CALCULO_COM_IMPORT_NOVO,
            'Calculo/index.ts': BARREL_DO_CALCULO,
          });
        },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(
        `barrels novos só com export ... from: ${emSrc('Calculo/index.ts')}`,
      );
      expect(resultado.saida).toContain(
        'ok, 2 arquivos na diferença, 1 renomeações, 0 declarações repartidas, 1 barrels novos, 4 ligações conferidas',
      );
    });

    it('falha com um index.ts novo que declara algo', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) =>
          repositorio.escrever({ 'Calculo/index.ts': `${BARREL_DO_CALCULO}export const EXTRA = 1;\n` }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('Calculo/index.ts', 'EXTRA'));
    });

    it('falha com um arquivo novo sem origem', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.escrever({ 'nova.ts': codigo('export const NOVA = 1;') }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('nova.ts', 'NOVA'));
      expect(resultado.erro).toContain(emSrc('nova.ts'));
    });

    it('falha com um arquivo novo vazio', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.escrever({ 'vazio.ts': '' }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('vazio.ts'));
    });

    it('falha quando o arquivo é apagado e só o barrel novo o reexporta', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'calculo.ts': CALCULO },
        depois: (repositorio) => {
          repositorio.apagar('calculo.ts');
          repositorio.escrever({ 'Calculo/index.ts': BARREL_DO_CALCULO });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`declaração perdida: dobro (${emSrc('calculo.ts')})`);
    });

    it('falha com um arquivo novo que só reexporta mas não se chama index.ts', () => {
      const resultado = executarCenario({
        base: { 'calculo.ts': CALCULO, 'soma.ts': SOMA },
        depois: (repositorio) => {
          repositorio.mover('calculo.ts', 'Calculo/calculo.ts');
          repositorio.escrever({
            'Calculo/calculo.ts': CALCULO_COM_IMPORT_NOVO,
            'Calculo/publico.ts': BARREL_DO_CALCULO,
          });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(arquivoNovoSemOrigem('Calculo/publico.ts'));
    });
  });

  describe('pares explícitos', () => {
    const IMPORTS_DEMAIS = codigo(
      "import { a } from './a';",
      "import { b } from './b';",
      "import { c } from './c';",
      "import { d } from './d';",
      '',
      'export const ligar = (): string => a + b + c + d;',
    );
    const IMPORTS_DEMAIS_EM_OUTRO_LUGAR = IMPORTS_DEMAIS.replace(/'\.\//g, "'../lib/");

    it('passa com o par de arquivo quando o git não casa o renome por falta de similaridade', () => {
      const resultado = executarCenario({
        base: { 'lib/ligar.ts': IMPORTS_DEMAIS },
        depois: (repositorio) => {
          repositorio.apagar('lib/ligar.ts');
          repositorio.escrever({ 'hooks/useLigar.ts': IMPORTS_DEMAIS_EM_OUTRO_LUGAR });
        },
        pares: { arquivos: [{ de: emSrc('lib/ligar.ts'), para: emSrc('hooks/useLigar.ts') }] },
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain(renomeacaoConferida('lib/ligar.ts', 'hooks/useLigar.ts'));
    });

    it('falha com o par de arquivo cujo conteúdo difere fora das linhas de import', () => {
      const resultado = executarCenario({
        base: { 'lib/ligar.ts': IMPORTS_DEMAIS },
        depois: (repositorio) => {
          repositorio.apagar('lib/ligar.ts');
          repositorio.escrever({
            'hooks/useLigar.ts': IMPORTS_DEMAIS_EM_OUTRO_LUGAR.replace('a + b', 'a - b'),
          });
        },
        pares: { arquivos: [{ de: emSrc('lib/ligar.ts'), para: emSrc('hooks/useLigar.ts') }] },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(renomeacaoComDiferenca('lib/ligar.ts', 'hooks/useLigar.ts'));
    });

    it('falha com o par de arquivo cujo arquivo antigo continua no HEAD', () => {
      const resultado = executarCenario({
        base: { 'lib/ligar.ts': IMPORTS_DEMAIS },
        depois: (repositorio) => repositorio.escrever({ 'hooks/useLigar.ts': IMPORTS_DEMAIS }),
        pares: { arquivos: [{ de: emSrc('lib/ligar.ts'), para: emSrc('hooks/useLigar.ts') }] },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('par de renomeação sem correspondência entre a base e o HEAD');
    });

    const BASE_DA_CHAVE = codigo(
      'export const TAMANHO_DA_CHAVE = 36;',
      '',
      'export function chaveDeIdempotencia(): string {',
      '  return crypto.randomUUID();',
      '}',
    );
    const PARA_O_HOOK = BASE_DA_CHAVE.replace('chaveDeIdempotencia', 'useChaveDeIdempotencia');
    const PAR_DE_DECLARACAO = {
      declaracoes: [
        {
          de: { arquivo: emSrc('lib/chaveDeIdempotencia.ts'), nome: 'chaveDeIdempotencia' },
          para: { arquivo: emSrc('hooks/useChaveDeIdempotencia.ts'), nome: 'useChaveDeIdempotencia' },
        },
      ],
    };

    it('passa com o par de declaração que troca de nome e mantém o corpo', () => {
      const resultado = executarCenario({
        base: { 'lib/chaveDeIdempotencia.ts': BASE_DA_CHAVE },
        depois: (repositorio) => {
          repositorio.apagar('lib/chaveDeIdempotencia.ts');
          repositorio.escrever({ 'hooks/useChaveDeIdempotencia.ts': PARA_O_HOOK });
        },
        pares: PAR_DE_DECLARACAO,
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain('useChaveDeIdempotencia (era chaveDeIdempotencia)');
    });

    it('falha sem o par quando a declaração troca de nome', () => {
      const resultado = executarCenario({
        base: { 'lib/chaveDeIdempotencia.ts': BASE_DA_CHAVE },
        depois: (repositorio) => {
          repositorio.apagar('lib/chaveDeIdempotencia.ts');
          repositorio.escrever({ 'hooks/useChaveDeIdempotencia.ts': PARA_O_HOOK });
        },
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('declaração perdida: chaveDeIdempotencia');
    });

    it('falha com o par de declaração cujo corpo muda', () => {
      const resultado = executarCenario({
        base: { 'lib/chaveDeIdempotencia.ts': BASE_DA_CHAVE },
        depois: (repositorio) => {
          repositorio.apagar('lib/chaveDeIdempotencia.ts');
          repositorio.escrever({
            'hooks/useChaveDeIdempotencia.ts': PARA_O_HOOK.replace('randomUUID()', 'randomUUID().trim()'),
          });
        },
        pares: PAR_DE_DECLARACAO,
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('corpo mudou: chaveDeIdempotencia');
    });
  });

  describe('entrada e saída', () => {
    it('não tem nada a conferir quando apps/web/src não muda', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => writeFileSync(join(repositorio.raiz, 'fora.md'), 'fora do src\n'),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain('nada a conferir em apps/web/src');
    });

    it('usa origin/main como base quando --base não é passado', () => {
      const repositorio = criarRepositorio();
      repositorio.escrever({ 'soma.ts': SOMA });
      const shaDaBase = repositorio.commitar('base');
      executarGit(repositorio.raiz, ['update-ref', 'refs/remotes/origin/main', shaDaBase]);
      repositorio.mover('soma.ts', 'matematica/soma.ts');
      repositorio.commitar('depois');

      const resultado = executarVerificador(repositorio.raiz);

      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain('renomeação:');
    });

    it('falha com mensagem clara quando a base não existe', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: () => undefined,
        argumentos: ['--base', 'ref-que-nao-existe'],
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('conferir-movimento: git merge-base ref-que-nao-existe HEAD');
    });

    it('lista o que foi conferido e a contagem final quando passa', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.mover('soma.ts', 'matematica/soma.ts'),
      });

      expect(resultado.saida).toContain(
        'ok, 1 arquivos na diferença, 1 renomeações, 0 declarações repartidas, 0 barrels novos, 1 ligações conferidas',
      );
    });

    it('falha com a lista das pendências quando há mudança não commitada em apps/web/src', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.mover('soma.ts', 'matematica/soma.ts'),
        pendencia: (repositorio) =>
          repositorio.escrever({ 'matematica/soma.ts': `${SOMA}export const EXTRA = 1;\n` }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.saida).toBe('');
      expect(resultado.erro).toContain('conferir-movimento: há mudanças não commitadas em apps/web/src');
      expect(resultado.erro).toContain(` M ${emSrc('matematica/soma.ts')}`);
      expect(resultado.erro).not.toContain('e mais');
    });

    it('falha quando o arquivo novo ainda não foi adicionado ao git', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.mover('soma.ts', 'matematica/soma.ts'),
        pendencia: (repositorio) => repositorio.escrever({ 'rascunho.ts': SOMA }),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain(`?? ${emSrc('rascunho.ts')}`);
    });

    it('lista só as primeiras pendências e conta as outras', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: () => undefined,
        pendencia: (repositorio) =>
          repositorio.escrever(
            Object.fromEntries(Array.from({ length: 12 }, (_, indice) => [`novo${indice}.ts`, SOMA])),
          ),
      });

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(resultado.erro).toContain('... e mais 2');
      expect(resultado.erro.split('\n').filter((linha) => linha.startsWith('??'))).toHaveLength(10);
    });

    it('ignora a mudança não commitada fora de apps/web/src', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA },
        depois: (repositorio) => repositorio.mover('soma.ts', 'matematica/soma.ts'),
        pendencia: (repositorio) => writeFileSync(join(repositorio.raiz, 'fora.md'), 'rascunho\n'),
      });

      expect(resultado.erro).toBe('');
      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
    });

    it('diz na ajuda o que prova, o que não prova e a regra da mudança não commitada', () => {
      const resultado = executarVerificador(criarRepositorio().raiz, ['--ajuda']);

      expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
      expect(resultado.saida).toContain('Falha com saída 1 se houver mudança não commitada em apps/web/src');
      expect(resultado.saida).toContain('Provado, com a leitura feita pelo compilador do TypeScript');
      expect(resultado.saida).toContain('Não provado:');
    });

    it('conta as diferenças e sai com 1 quando falha', () => {
      const resultado = executarCenario({
        base: { 'soma.ts': SOMA, 'utilitarios.ts': UTILITARIOS },
        depois: (repositorio) => repositorio.escrever({ 'utilitarios.ts': UTILITARIOS_SEM_SOMAR }),
      });

      const diferencas = resultado.erro.split('\n').filter((linha) => linha.startsWith('DIFERENÇA '));

      expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
      expect(diferencas.length).toBeGreaterThan(0);
      expect(resultado.erro).toContain(`conferir-movimento: ${diferencas.length} diferenças contra`);
    });
  });
});
