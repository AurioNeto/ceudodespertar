import { afterEach, describe, expect, it } from 'vitest';
import {
  CODIGO_DE_FALHA,
  CODIGO_DE_SUCESSO,
  codigo,
  emSrc,
  executarCenario,
  removerRepositoriosCriados,
  type Repositorio,
  type Resultado,
  TEMPO_DO_CENARIO_EM_MS,
  trocar,
} from './apoioDoConferirMovimento';

const BOTAO = codigo("export const Botao = (): string => 'botao';");

const CAMPO = codigo("export const Campo = (): string => 'campo';");

const FORMATO = codigo('export const formatar = (valor: number): string => valor.toFixed(2);');

const ESTILO_GLOBAL = codigo('body { margin: 0; }');

const BARREL_DO_DS = codigo("export { Botao } from './Botao';", "export { Campo } from './Campo';");

const BARREL_DO_DS_DEPOIS = trocar(BARREL_DO_DS, "'./Botao'", "'./atoms/Botao'");

const BARREL_DO_BOTAO = codigo("export { Botao } from './Botao';");

const TELA = codigo(
  "import type { Campo } from '../ds';",
  "import { Botao } from '../ds';",
  "import { useState } from 'react';",
  "import * as dom from 'react-dom';",
  "import * as formato from '../lib/formato';",
  "import '../estilos/global.css';",
  '',
  "export const carregar = () => import('../lib/formato');",
  '',
  'export const LARGURA = 320;',
  'export const ALTURA = 480;',
  'export const TITULO = "tela";',
  'export const SUBTITULO = "subtitulo";',
  'export const RODAPE = "rodape";',
  '',
  'export const Tela = (): string => Botao() + String(useState) + String(formato) + String(dom);',
  'export type CampoDaTela = Campo;',
);

const TELA_DE_TESTE = codigo(
  "import { vi } from 'vitest';",
  '',
  "vi.mock('../lib/formato', () => ({ formatar: () => 'formatado' }));",
  '',
  'export const LARGURA = 320;',
  'export const ALTURA = 480;',
  'export const TITULO = "tela";',
  'export const SUBTITULO = "subtitulo";',
  'export const RODAPE = "rodape";',
);

const VALOR = codigo(
  "import { formatar } from '../lib/formato';",
  '',
  'export const LARGURA = 320;',
  'export const ALTURA = 480;',
  'export const TITULO = "valor";',
  'export const valor = formatar(1);',
);

const BASE_DO_DS = {
  'pages/Valor.ts': VALOR,
  'ds/Botao.ts': BOTAO,
  'ds/Campo.ts': CAMPO,
  'ds/index.ts': BARREL_DO_DS,
  'lib/formato.ts': FORMATO,
  'estilos/global.css': ESTILO_GLOBAL,
  'pages/Tela.ts': TELA,
  'pages/Tela.dom.test.ts': TELA_DE_TESTE,
};

const declaracaoDe = (arquivo: string, nome: string): string => `${emSrc(arquivo)}#${nome}`;

const importNovo = (arquivo: string, descricao: string): string =>
  `ligação de import nova: ${emSrc(arquivo)}: ${descricao}`;

const importPerdido = (arquivo: string, descricao: string): string =>
  `ligação de import perdida: ${emSrc(arquivo)}: ${descricao}`;

const exportacaoNova = (arquivo: string, descricao: string): string =>
  `exportação nova: ${emSrc(arquivo)}: ${descricao}`;

const exportacaoPerdida = (arquivo: string, descricao: string): string =>
  `exportação perdida: ${emSrc(arquivo)}: ${descricao}`;

const referenciaNova = (arquivo: string, alvo: string): string =>
  `referência de módulo nova: ${emSrc(arquivo)}: import(), import type ou vi.mock <- ${emSrc(alvo)}`;

const referenciaPerdida = (arquivo: string, alvo: string): string =>
  `referência de módulo perdida: ${emSrc(arquivo)}: import(), import type ou vi.mock <- ${emSrc(alvo)}`;

function moverOBotao(repositorio: Repositorio): void {
  repositorio.mover('ds/Botao.ts', 'ds/atoms/Botao/Botao.ts');
  repositorio.escrever({
    'ds/atoms/Botao/index.ts': BARREL_DO_BOTAO,
    'ds/index.ts': BARREL_DO_DS_DEPOIS,
  });
}

function conferirComOBotaoMovido(depois: (repositorio: Repositorio) => void = () => undefined): Resultado {
  return executarCenario({
    base: BASE_DO_DS,
    depois: (repositorio) => {
      moverOBotao(repositorio);
      depois(repositorio);
    },
  });
}

const conferirComATela = (novaTela: string): Resultado =>
  conferirComOBotaoMovido((repositorio) => repositorio.escrever({ 'pages/Tela.ts': novaTela }));

const conferirComODsNovo = (novoIndice: string): Resultado =>
  conferirComOBotaoMovido((repositorio) => repositorio.escrever({ 'ds/index.ts': novoIndice }));

const conferirComOTesteNovo = (novoTeste: string): Resultado =>
  conferirComOBotaoMovido((repositorio) => repositorio.escrever({ 'pages/Tela.dom.test.ts': novoTeste }));

const conferirComOBarrelDoBotao = (novoBarrel: string): Resultado =>
  conferirComOBotaoMovido((repositorio) =>
    repositorio.escrever({ 'ds/atoms/Botao/index.ts': novoBarrel }),
  );

const PREFIXO_DA_DIFERENCA = 'DIFERENÇA ';

const diferencasDe = (resultado: Resultado): string[] =>
  resultado.erro
    .split('\n')
    .filter((linha) => linha.startsWith(PREFIXO_DA_DIFERENCA))
    .map((linha) => linha.slice(PREFIXO_DA_DIFERENCA.length));

const falhou = (resultado: Resultado): void => {
  expect(resultado.codigo).toBe(CODIGO_DE_FALHA);
};

const passou = (resultado: Resultado): void => {
  expect(resultado.erro).toBe('');
  expect(resultado.codigo).toBe(CODIGO_DE_SUCESSO);
};

afterEach(removerRepositoriosCriados);

describe('conferir-movimento: ligações', { timeout: TEMPO_DO_CENARIO_EM_MS }, () => {
  describe('imports', () => {
    it('passa quando a declaração muda de nível e o barrel novo a reexporta', () => {
      passou(conferirComOBotaoMovido());
    });

    it('passa quando o import troca o barrel pelo caminho direto da mesma declaração', () => {
      passou(
        conferirComATela(
          trocar(TELA, "import { Botao } from '../ds';", "import { Botao } from '../ds/atoms/Botao/Botao';"),
        ),
      );
    });

    it('passa quando o import passa pelo index.ts da unidade', () => {
      passou(
        conferirComATela(
          trocar(TELA, "import { Botao } from '../ds';", "import { Botao } from '../ds/atoms/Botao';"),
        ),
      );
    });

    it('falha quando o import type vira import com type no nome, que deixa um import de efeito', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import type { Campo } from '../ds';", "import { type Campo } from '../ds';"),
      );

      falhou(resultado);
      expect(diferencasDe(resultado)).toEqual([
        importNovo('pages/Tela.ts', `import de efeito <- ${emSrc('ds/index.ts')}`),
      ]);
    });

    it('falha quando o import com type no nome vira import type, que tira o import de efeito', () => {
      const resultado = executarCenario({
        base: {
          ...BASE_DO_DS,
          'pages/Tela.ts': trocar(TELA, "import type { Campo } from '../ds';", "import { type Campo } from '../ds';"),
        },
        depois: (repositorio) => {
          moverOBotao(repositorio);
          repositorio.escrever({ 'pages/Tela.ts': TELA });
        },
      });

      falhou(resultado);
      expect(diferencasDe(resultado)).toEqual([
        importPerdido('pages/Tela.ts', `import de efeito <- ${emSrc('ds/index.ts')}`),
      ]);
    });

    it('falha quando o import {} from vira import type {} from', () => {
      const base = trocar(TELA, "import type { Campo } from '../ds';", "import {} from '../ds';");
      const resultado = executarCenario({
        base: { ...BASE_DO_DS, 'pages/Tela.ts': base },
        depois: (repositorio) => {
          moverOBotao(repositorio);
          repositorio.escrever({ 'pages/Tela.ts': trocar(base, "import {} from '../ds';", "import type {} from '../ds';") });
        },
      });

      falhou(resultado);
      expect(diferencasDe(resultado)).toEqual([
        importPerdido('pages/Tela.ts', `import de efeito <- ${emSrc('ds/index.ts')}`),
      ]);
    });

    it('passa quando o import de tipo se junta ao import de valor com type no nome', () => {
      passou(
        conferirComATela(
          trocar(
            trocar(TELA, "import type { Campo } from '../ds';\n", ''),
            "import { Botao } from '../ds';",
            "import { Botao, type Campo } from '../ds';",
          ),
        ),
      );
    });

    it('passa quando o import padrão e o import de tipo do mesmo módulo viram um só', () => {
      const separados = codigo(
        "import padrao from '../lib/padrao';",
        "import type { Tipo } from '../lib/padrao';",
        '',
        'export const usar = (valor: Tipo): string => padrao() + String(valor);',
      );
      const juntos = codigo(
        "import padrao, { type Tipo } from '../lib/padrao';",
        '',
        'export const usar = (valor: Tipo): string => padrao() + String(valor);',
      );
      const padrao = codigo(
        'export type Tipo = number;',
        'export default function padrao(): string {',
        "  return 'padrao';",
        '}',
      );

      const resultado = executarCenario({
        base: { 'lib/padrao.ts': padrao, 'pages/Usa.ts': separados },
        depois: (repositorio) => repositorio.escrever({ 'pages/Usa.ts': juntos }),
      });

      passou(resultado);
    });

    it('passa quando o consumidor muda de lugar e ajusta os caminhos', () => {
      const resultado = conferirComOBotaoMovido((repositorio) => {
        repositorio.mover('pages/Tela.ts', 'pages/tela/Tela.ts');
        repositorio.escrever({ 'pages/tela/Tela.ts': TELA.replaceAll("'../", "'../../") });
      });

      passou(resultado);
    });

    it('falha quando o import passa a ligar o nome a outro nome do mesmo módulo', () => {
      const resultado = conferirComATela(
        trocar(
          TELA,
          "import { useState } from 'react';",
          "import { useState as useStateOriginal, useReducer as useState } from 'react';",
        ),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/Tela.ts', 'useState <- react#useReducer'));
      expect(resultado.erro).toContain(importNovo('pages/Tela.ts', 'useStateOriginal <- react#useState'));
      expect(resultado.erro).toContain(importPerdido('pages/Tela.ts', 'useState <- react#useState'));
    });

    it('falha quando o import nomeado do ds passa a apontar para outra declaração', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import { Botao } from '../ds';", "import { Campo as Botao } from '../ds';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Tela.ts', `Botao <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
      expect(resultado.erro).toContain(
        importPerdido('pages/Tela.ts', `Botao <- ${declaracaoDe('ds/atoms/Botao/Botao.ts', 'Botao')}`),
      );
    });

    it('falha quando entra um import de efeito', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import '../estilos/global.css';", "import '../estilos/global.css';\nimport '../lib/formato';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Tela.ts', `import de efeito <- ${emSrc('lib/formato.ts')}`),
      );
    });

    it('falha quando o import de efeito troca de arquivo', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import '../estilos/global.css';", "import '../estilos/outro.css';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Tela.ts', `import de efeito <- ${emSrc('estilos/outro.css')}`),
      );
      expect(resultado.erro).toContain(
        importPerdido('pages/Tela.ts', `import de efeito <- ${emSrc('estilos/global.css')}`),
      );
    });

    it('falha quando o import de efeito some', () => {
      const resultado = conferirComATela(trocar(TELA, "import '../estilos/global.css';\n", ''));

      falhou(resultado);
      expect(resultado.erro).toContain(
        importPerdido('pages/Tela.ts', `import de efeito <- ${emSrc('estilos/global.css')}`),
      );
    });

    it('falha quando o import type vira import de valor', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import type { Campo } from '../ds';", "import { Campo } from '../ds';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Tela.ts', `Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
      expect(resultado.erro).toContain(
        importPerdido('pages/Tela.ts', `type Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('falha quando o import namespace passa a apontar para outro módulo', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import * as formato from '../lib/formato';", "import * as formato from '../ds/Campo';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/Tela.ts', `formato <- ${emSrc('ds/Campo.ts')}`));
      expect(resultado.erro).toContain(
        importPerdido('pages/Tela.ts', `formato <- ${emSrc('lib/formato.ts')}`),
      );
    });

    it('falha quando o import namespace de pacote externo passa a vir de outro pacote', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import * as dom from 'react-dom';", "import * as dom from 'react';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/Tela.ts', 'dom <- react'));
      expect(resultado.erro).toContain(importPerdido('pages/Tela.ts', 'dom <- react-dom'));
    });

    it('não lista como conferida a renomeação cujo import passou a apontar para o vazio', () => {
      const resultado = conferirComOBotaoMovido((repositorio) =>
        repositorio.mover('pages/Valor.ts', 'pages/valor/Valor.ts'),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/valor/Valor.ts', `formatar <- ${emSrc('pages/lib/formato')}#formatar`));
      expect(resultado.saida).not.toContain('renomeação: apps/web/src/pages/Valor.ts');
    });

    it('falha quando o import() dinâmico passa a carregar outro módulo', () => {
      const resultado = conferirComATela(
        trocar(TELA, "import('../lib/formato')", "import('../ds/Campo')"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(referenciaNova('pages/Tela.ts', 'ds/Campo.ts'));
      expect(resultado.erro).toContain(referenciaPerdida('pages/Tela.ts', 'lib/formato.ts'));
    });

    it('falha quando o vi.mock passa a mirar outro módulo', () => {
      const resultado = conferirComOTesteNovo(
        trocar(TELA_DE_TESTE, "vi.mock('../lib/formato'", "vi.mock('../ds/Campo'"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(referenciaNova('pages/Tela.dom.test.ts', 'ds/Campo.ts'));
      expect(resultado.erro).toContain(referenciaPerdida('pages/Tela.dom.test.ts', 'lib/formato.ts'));
    });

    it('passa quando o arquivo novo reúne declarações de dois arquivos e os imports de ambos', () => {
      const resultado = executarCenario({
        base: {
          'x.ts': codigo('export const x = 1;'),
          'y.ts': codigo('export const y = 2;'),
          'a.ts': codigo("import { x } from './x';", '', 'export const A = x + 1;'),
          'b.ts': codigo("import { y } from './y';", '', 'export const B = y + 2;'),
        },
        depois: (repositorio) => {
          repositorio.apagar('a.ts');
          repositorio.apagar('b.ts');
          repositorio.escrever({
            'junto.ts': codigo(
              "import { x } from './x';",
              "import { y } from './y';",
              '',
              'export const A = x + 1;',
              'export const B = y + 2;',
            ),
          });
        },
      });

      passou(resultado);
    });

    it('falha quando o arquivo que perdeu a declaração passa a importar o nome de outro arquivo', () => {
      const resultado = executarCenario({
        base: {
          'tudo.ts': codigo(
            'const auxiliar = (valor: number): number => valor + 1;',
            '',
            'export const principal = auxiliar(1);',
          ),
          'outro.ts': codigo('export const auxiliar = (valor: number): number => valor + 100;'),
        },
        depois: (repositorio) =>
          repositorio.escrever({
            'tudo.ts': codigo("import { auxiliar } from './outro';", '', 'export const principal = auxiliar(1);'),
            'auxiliar.ts': codigo('export const auxiliar = (valor: number): number => valor + 1;'),
          }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('tudo.ts', `auxiliar <- ${declaracaoDe('outro.ts', 'auxiliar')}`),
      );
    });

    it('falha quando um arquivo passa a importar a si mesmo', () => {
      const proprio = codigo('export const A = 1;', 'export const B = 2;');
      const resultado = executarCenario({
        base: { 'proprio.ts': proprio },
        depois: (repositorio) =>
          repositorio.escrever({ 'proprio.ts': `import { A as Copia } from './proprio';\n${proprio}` }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('proprio.ts', `Copia <- ${declaracaoDe('proprio.ts', 'A')}`));
    });

    it('falha quando o consumidor não tocado continua apontando para o caminho antigo', () => {
      const resultado = executarCenario({
        base: { ...BASE_DO_DS, 'pages/Direto.ts': codigo("import { Botao } from '../ds/Botao';", 'export default Botao;') },
        depois: moverOBotao,
      });

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/Direto.ts', `Botao <- ${emSrc('ds/Botao')}#Botao`));
      expect(resultado.erro).toContain(
        importPerdido('pages/Direto.ts', `Botao <- ${declaracaoDe('ds/atoms/Botao/Botao.ts', 'Botao')}`),
      );
    });
  });

  describe('imports de formas menos comuns', () => {
    const PREENCHIMENTO = [
      'export const LARGURA = 320;',
      'export const ALTURA = 480;',
      'export const TITULO = "pagina";',
      'export const SUBTITULO = "subtitulo";',
    ];

    const legado = (caminho: string, introducao = 'import type'): string =>
      codigo(`${introducao} formato = require('${caminho}');`, '', ...PREENCHIMENTO, 'export type Formato = typeof formato;');

    const tipos = (caminho: string, introducao = 'import type * as'): string =>
      codigo(`${introducao} formato from '${caminho}';`, '', ...PREENCHIMENTO, 'export type Formato = typeof formato;');

    const usaOPadrao = (caminho: string): string =>
      codigo(`import padrao from '${caminho}';`, '', ...PREENCHIMENTO, 'export const usar = padrao();');

    const PADRAO = codigo('export default function padrao(): string {', "  return 'padrao';", '}');

    const CONSTANTES_DO_UTIL = ['export const LARGURA = 320;', 'export const ALTURA = 480;'];

    const UTIL_COM_PADRAO = codigo(...CONSTANTES_DO_UTIL, '', PADRAO.trim());

    const UTIL_SEM_PADRAO = codigo(...CONSTANTES_DO_UTIL);

    const base = {
      'lib/formato.ts': FORMATO,
      'lib/padrao.ts': PADRAO,
      'lib/util.ts': UTIL_COM_PADRAO,
      'pages/Legado.ts': legado('../lib/formato'),
      'pages/Tipos.ts': tipos('../lib/formato'),
      'pages/UsaOPadrao.ts': usaOPadrao('../lib/padrao'),
      'pages/UsaOUtil.ts': usaOPadrao('../lib/util'),
    };

    const moverOFormato = (repositorio: Repositorio, consumidores: Record<string, string> = {}): void => {
      repositorio.mover('lib/formato.ts', 'lib/texto/formato.ts');
      repositorio.escrever({
        'pages/Legado.ts': legado('../lib/texto/formato'),
        'pages/Tipos.ts': tipos('../lib/texto/formato'),
        ...consumidores,
      });
    };

    const moverOPadrao = (repositorio: Repositorio, consumidor: string): void => {
      repositorio.mover('lib/padrao.ts', 'lib/texto/padrao.ts');
      repositorio.escrever({ 'pages/UsaOPadrao.ts': consumidor });
    };

    const tirarOPadraoDoUtil = (repositorio: Repositorio, consumidor: string): void =>
      repositorio.escrever({
        'lib/util.ts': UTIL_SEM_PADRAO,
        'lib/solto.ts': PADRAO,
        'pages/UsaOUtil.ts': consumidor,
      });

    it('passa quando o import default acompanha a declaração movida', () => {
      passou(
        executarCenario({
          base,
          depois: (repositorio) => moverOPadrao(repositorio, usaOPadrao('../lib/texto/padrao')),
        }),
      );
    });

    it('falha quando o import default passa a vir de um módulo sem esse default', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) => moverOPadrao(repositorio, usaOPadrao('../lib/formato')),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/UsaOPadrao.ts', `padrao <- ${declaracaoDe('lib/formato.ts', 'default')}`),
      );
    });

    it('passa quando o export default de um identificador sai do arquivo junto com ele', () => {
      const composto = codigo(...CONSTANTES_DO_UTIL, '', "const padrao = (): string => 'padrao';", 'export default padrao;');
      const solto = codigo("const padrao = (): string => 'padrao';", 'export default padrao;');
      const resultado = executarCenario({
        base: { 'lib/composto.ts': composto, 'pages/UsaOComposto.ts': usaOPadrao('../lib/composto') },
        depois: (repositorio) =>
          repositorio.escrever({
            'lib/composto.ts': codigo(...CONSTANTES_DO_UTIL),
            'lib/solto.ts': solto,
            'pages/UsaOComposto.ts': usaOPadrao('../lib/solto'),
          }),
      });

      passou(resultado);
    });

    it('passa quando o consumidor troca o repasse do export default pelo caminho direto', () => {
      const repasse = codigo("import padrao from './padrao';", '', ...PREENCHIMENTO, 'export default padrao;');
      const resultado = executarCenario({
        base: { 'lib/padrao.ts': PADRAO, 'lib/repasse.ts': repasse, 'pages/UsaORepasse.ts': usaOPadrao('../lib/repasse') },
        depois: (repositorio) => {
          repositorio.mover('lib/padrao.ts', 'lib/texto/padrao.ts');
          repositorio.escrever({
            'lib/repasse.ts': trocar(repasse, "'./padrao'", "'./texto/padrao'"),
            'pages/UsaORepasse.ts': usaOPadrao('../lib/texto/padrao'),
          });
        },
      });

      passou(resultado);
    });

    it('passa quando o export default sem nome sai do arquivo e o consumidor importa do arquivo novo', () => {
      const anonima = codigo('export default function () {', "  return 'anonima';", '}');
      const resultado = executarCenario({
        base: {
          'lib/composto.ts': codigo(...CONSTANTES_DO_UTIL, '', anonima.trim()),
          'pages/UsaOComposto.ts': usaOPadrao('../lib/composto'),
        },
        depois: (repositorio) =>
          repositorio.escrever({
            'lib/composto.ts': codigo(...CONSTANTES_DO_UTIL),
            'lib/solto.ts': anonima,
            'pages/UsaOComposto.ts': usaOPadrao('../lib/solto'),
          }),
      });

      passou(resultado);
    });

    it('passa quando o export default sai do arquivo e o consumidor importa do arquivo novo', () => {
      passou(
        executarCenario({
          base,
          depois: (repositorio) => tirarOPadraoDoUtil(repositorio, usaOPadrao('../lib/solto')),
        }),
      );
    });

    it('falha quando o export default sai do arquivo e o consumidor continua importando do antigo', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) => tirarOPadraoDoUtil(repositorio, usaOPadrao('../lib/util')),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/UsaOUtil.ts', `padrao <- ${declaracaoDe('lib/util.ts', 'default')}`),
      );
    });

    it('não lê como código o arquivo que não é código e só muda de lugar', () => {
      const estilo = codigo("import '../lib/formato';", '', ...PREENCHIMENTO);
      const resultado = executarCenario({
        base: { 'lib/formato.ts': FORMATO, 'estilos/marca.css': estilo },
        depois: (repositorio) => repositorio.mover('estilos/marca.css', 'estilos/temas/marca.css'),
      });

      passou(resultado);
    });

    it('passa quando o import = require() e o import type * as acompanham o módulo movido', () => {
      passou(executarCenario({ base, depois: (repositorio) => moverOFormato(repositorio) }));
    });

    it('falha quando o import type * as vira import de valor', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          moverOFormato(repositorio, { 'pages/Tipos.ts': tipos('../lib/texto/formato', 'import * as') }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Tipos.ts', `formato <- ${emSrc('lib/texto/formato.ts')}`),
      );
      expect(resultado.erro).toContain(
        importPerdido('pages/Tipos.ts', `type formato <- ${emSrc('lib/texto/formato.ts')}`),
      );
    });

    it('falha quando o import type = require() vira import de valor', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          moverOFormato(repositorio, { 'pages/Legado.ts': legado('../lib/texto/formato', 'import') }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Legado.ts', `formato <- ${emSrc('lib/texto/formato.ts')}`),
      );
      expect(resultado.erro).toContain(
        importPerdido('pages/Legado.ts', `type formato <- ${emSrc('lib/texto/formato.ts')}`),
      );
    });

    it('falha quando o import = require() passa a apontar para outro módulo', () => {
      const resultado = executarCenario({
        base,
        depois: (repositorio) =>
          moverOFormato(repositorio, { 'pages/Legado.ts': legado('../lib/padrao') }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(importNovo('pages/Legado.ts', `type formato <- ${emSrc('lib/padrao.ts')}`));
      expect(resultado.erro).toContain(
        importPerdido('pages/Legado.ts', `type formato <- ${emSrc('lib/texto/formato.ts')}`),
      );
    });
  });

  describe('referências de módulo presas à sua declaração', () => {
    const PREENCHIMENTO = [
      'export const LARGURA = 320;',
      'export const ALTURA = 480;',
      'export const TITULO = "rotas";',
      'export const SUBTITULO = "subtitulo";',
      'export const RODAPE = "rodape";',
    ];

    const MODULOS = {
      'pages/A.ts': codigo("export const PaginaA = (): string => 'a';"),
      'pages/B.ts': codigo("export const PaginaB = (): string => 'b';"),
      'pages/C.ts': codigo("export const PaginaC = (): string => 'c';"),
      'lib/formato.ts': FORMATO,
      'lib/padrao.ts': codigo("export const padrao = (): string => 'padrao';"),
    };

    const rotasEmObjeto = (alvos: string[], prefixo = './pages/'): string =>
      codigo(
        'export const rotas = {',
        ...alvos.map((alvo, indice) => `  r${indice}: () => import('${prefixo}${alvo}'),`),
        '};',
        '',
        ...PREENCHIMENTO,
      );

    const rotasEmDeclaracoes = (primeiro: string, segundo: string): string =>
      codigo(
        `export const rotaA = () => import('./pages/${primeiro}');`,
        `export const rotaB = () => import('./pages/${segundo}');`,
        '',
        ...PREENCHIMENTO,
      );

    const tiposDeModulo = (primeiro: string, segundo: string): string =>
      codigo(
        `export type ModuloA = typeof import('./pages/${primeiro}');`,
        `export type ModuloB = typeof import('./pages/${segundo}');`,
        '',
        ...PREENCHIMENTO,
      );

    const mocks = (primeiro: string, segundo: string, prefixo = '../lib/'): string =>
      codigo(
        "import { vi } from 'vitest';",
        '',
        `vi.mock('${prefixo}${primeiro}', () => ({ formatar: () => 'formatado' }));`,
        `vi.mock('${prefixo}${segundo}', () => ({ padrao: () => 'simulado' }));`,
        '',
        ...PREENCHIMENTO,
      );

    const trocarNoLugar = (arquivo: string, antes: string, depois: string): Resultado =>
      executarCenario({
        base: { ...MODULOS, [arquivo]: antes },
        depois: (repositorio) => repositorio.escrever({ [arquivo]: depois }),
      });

    const trocarMudandoDePasta = (de: string, para: string, antes: string, depois: string): Resultado =>
      executarCenario({
        base: { ...MODULOS, [de]: antes },
        depois: (repositorio) => {
          repositorio.mover(de, para);
          repositorio.escrever({ [para]: depois });
        },
      });

    it('falha quando dois import() da mesma declaração trocam de alvo', () => {
      const resultado = trocarNoLugar('rotas.ts', rotasEmObjeto(['A', 'B']), rotasEmObjeto(['B', 'A']));

      falhou(resultado);
      expect(resultado.erro).toContain(
        `corpo mudou: rotas (${emSrc('rotas.ts')} -> ${emSrc('rotas.ts')})`,
      );
    });

    it('falha quando só o segundo e o terceiro import() da declaração trocam de alvo', () => {
      const resultado = trocarNoLugar(
        'rotas.ts',
        rotasEmObjeto(['A', 'B', 'C']),
        rotasEmObjeto(['A', 'C', 'B']),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        `corpo mudou: rotas (${emSrc('rotas.ts')} -> ${emSrc('rotas.ts')})`,
      );
    });

    it('falha quando dois import() de declarações com o mesmo corpo trocam de alvo', () => {
      const resultado = trocarNoLugar('rotas.ts', rotasEmDeclaracoes('A', 'B'), rotasEmDeclaracoes('B', 'A'));

      falhou(resultado);
      expect(resultado.erro).toContain('corpo mudou: rotaA');
      expect(resultado.erro).toContain('corpo mudou: rotaB');
    });

    it('falha quando dois import type trocam de alvo', () => {
      const resultado = trocarNoLugar('tipos.ts', tiposDeModulo('A', 'B'), tiposDeModulo('B', 'A'));

      falhou(resultado);
      expect(resultado.erro).toContain('corpo mudou: ModuloA');
      expect(resultado.erro).toContain('corpo mudou: ModuloB');
    });

    it('falha quando dois vi.mock com fábricas distintas trocam de caminho', () => {
      const resultado = trocarNoLugar(
        'pages/Telas.dom.test.ts',
        mocks('formato', 'padrao'),
        mocks('padrao', 'formato'),
      );

      falhou(resultado);
      expect(resultado.erro).toContain("corpo mudou: vi.mock('<modulo>', () => ({ formatar");
      expect(resultado.erro).toContain("corpo mudou: vi.mock('<modulo>', () => ({ padrao");
    });

    it('falha quando o arquivo movido troca os alvos de dois import()', () => {
      const resultado = trocarMudandoDePasta(
        'rotas.ts',
        'app/rotas.ts',
        rotasEmObjeto(['A', 'B']),
        rotasEmObjeto(['B', 'A'], '../pages/'),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        `corpo mudou: rotas (${emSrc('rotas.ts')} -> ${emSrc('app/rotas.ts')})`,
      );
    });

    it('falha quando o arquivo de teste movido troca os caminhos de dois vi.mock', () => {
      const resultado = trocarMudandoDePasta(
        'pages/Telas.dom.test.ts',
        'pages/telas/Telas.dom.test.ts',
        mocks('formato', 'padrao'),
        mocks('padrao', 'formato', '../../lib/'),
      );

      falhou(resultado);
    });

    it('passa quando o arquivo movido ajusta os caminhos e cada import() mantém o seu alvo', () => {
      passou(
        trocarMudandoDePasta(
          'rotas.ts',
          'app/rotas.ts',
          rotasEmObjeto(['A', 'B']),
          rotasEmObjeto(['A', 'B'], '../pages/'),
        ),
      );
    });

    it('passa quando o import() acompanha o módulo movido', () => {
      const resultado = executarCenario({
        base: { ...MODULOS, 'rotas.ts': rotasEmObjeto(['A', 'B']) },
        depois: (repositorio) => {
          repositorio.mover('pages/A.ts', 'pages/a/A.ts');
          repositorio.escrever({ 'rotas.ts': rotasEmObjeto(['a/A', 'B']) });
        },
      });

      passou(resultado);
    });

    it('passa quando o arquivo e o módulo do import() mudam de lugar juntos', () => {
      const resultado = executarCenario({
        base: { ...MODULOS, 'rotas.ts': rotasEmObjeto(['A', 'B']) },
        depois: (repositorio) => {
          repositorio.mover('pages/A.ts', 'pages/a/A.ts');
          repositorio.mover('rotas.ts', 'app/rotas.ts');
          repositorio.escrever({ 'app/rotas.ts': rotasEmObjeto(['a/A', 'B'], '../pages/') });
        },
      });

      passou(resultado);
    });
  });

  describe('imports por alias do tsconfig', () => {
    const TSCONFIG = JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } } });

    const CONSUMIDOR = codigo(
      "import { formatar } from '@/lib/formato';",
      '',
      'export const LARGURA = 320;',
      'export const ALTURA = 480;',
      'export const TITULO = "alias";',
      'export const SUBTITULO = "subtitulo";',
      'export const usar = (): string => formatar(1);',
    );

    const base = { 'lib/formato.ts': FORMATO, 'pages/Alias.ts': CONSUMIDOR };

    const moverOFormato = (repositorio: Repositorio, consumidor: string): void => {
      repositorio.mover('lib/formato.ts', 'lib/texto/formato.ts');
      repositorio.escrever({ 'pages/Alias.ts': consumidor });
    };

    it('passa quando o alias passa a apontar para o novo caminho da mesma declaração', () => {
      const resultado = executarCenario({
        base,
        foraDoSrc: { 'apps/web/tsconfig.json': TSCONFIG },
        depois: (repositorio) =>
          moverOFormato(repositorio, trocar(CONSUMIDOR, "'@/lib/formato'", "'@/lib/texto/formato'")),
      });

      passou(resultado);
    });

    it('passa quando o alias vem de um tsconfig herdado', () => {
      const resultado = executarCenario({
        base,
        foraDoSrc: {
          'apps/web/tsconfig.json': JSON.stringify({ extends: '../../tsconfig.base' }),
          'tsconfig.base.json': JSON.stringify({
            compilerOptions: { baseUrl: 'apps/web', paths: { '@/*': ['./src/*'] } },
          }),
        },
        depois: (repositorio) =>
          moverOFormato(repositorio, trocar(CONSUMIDOR, "'@/lib/formato'", "'@/lib/texto/formato'")),
      });

      passou(resultado);
    });

    it('falha quando o alias passa a apontar para outra declaração', () => {
      const resultado = executarCenario({
        base: { ...base, 'lib/outro.ts': codigo('export const formatar = (): string => "outro";') },
        foraDoSrc: { 'apps/web/tsconfig.json': TSCONFIG },
        depois: (repositorio) =>
          moverOFormato(repositorio, trocar(CONSUMIDOR, "'@/lib/formato'", "'@/lib/outro'")),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo('pages/Alias.ts', `formatar <- ${declaracaoDe('lib/outro.ts', 'formatar')}`),
      );
    });
  });

  describe('barrels e exportações', () => {
    it('falha quando o barrel que já existia ganha uma exportação', () => {
      const resultado = conferirComODsNovo(
        `${BARREL_DO_DS_DEPOIS}export { formatar } from '../lib/formato';\n`,
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/index.ts', `formatar <- ${declaracaoDe('lib/formato.ts', 'formatar')}`),
      );
    });

    it('falha quando o barrel que já existia perde uma exportação', () => {
      const resultado = conferirComODsNovo(codigo("export { Botao } from './atoms/Botao';"));

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoPerdida('ds/index.ts', `Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('falha quando o barrel que já existia religa um nome a outra declaração', () => {
      const resultado = conferirComODsNovo(
        trocar(BARREL_DO_DS_DEPOIS, "export { Botao } from './atoms/Botao';", "export { Campo as Botao } from './Campo';"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/index.ts', `Botao <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('falha quando o barrel que já existia passa a reexportar só o tipo', () => {
      const resultado = conferirComODsNovo(
        trocar(BARREL_DO_DS_DEPOIS, "export { Campo }", "export type { Campo }"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/index.ts', `type Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
      expect(resultado.erro).toContain(
        exportacaoPerdida('ds/index.ts', `Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('falha quando o index.ts novo reexporta com um nome que a base não exportava', () => {
      const resultado = conferirComOBarrelDoBotao(`${BARREL_DO_BOTAO}export { Botao as Botoeira } from './Botao';\n`);

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova(
          'ds/atoms/Botao/index.ts',
          `Botoeira <- ${declaracaoDe('ds/atoms/Botao/Botao.ts', 'Botao')}`,
        ),
      );
    });

    it('falha quando o index.ts novo liga um nome já exportado a outra declaração', () => {
      const resultado = conferirComOBarrelDoBotao(codigo("export { Campo as Botao } from '../../Campo';"));

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/atoms/Botao/index.ts', `Botao <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('falha quando o index.ts novo reexporta um nome que o arquivo de origem não exporta', () => {
      const resultado = conferirComOBarrelDoBotao(`${BARREL_DO_BOTAO}export { Fantasma } from './Botao';\n`);

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova(
          'ds/atoms/Botao/index.ts',
          `Fantasma <- ${declaracaoDe('ds/atoms/Botao/Botao.ts', 'Fantasma')}`,
        ),
      );
    });

    it('passa quando o index.ts novo reexporta só nomes que a base já exportava, com o mesmo alvo', () => {
      passou(
        conferirComOBarrelDoBotao(
          codigo(
            "export { Botao } from './Botao';",
            "export { Campo } from '../../Campo';",
            "export * from '../../../lib/formato';",
          ),
        ),
      );
    });

    it('passa quando o barrel exporta com alias e o alias continua o mesmo', () => {
      const comAlias = codigo("export { Botao as Botoeira } from './Botao';", "export { Campo } from './Campo';");
      const resultado = executarCenario({
        base: { 'ds/Botao.ts': BOTAO, 'ds/Campo.ts': CAMPO, 'ds/index.ts': comAlias },
        depois: (repositorio) => {
          repositorio.mover('ds/Botao.ts', 'ds/atoms/Botao/Botao.ts');
          repositorio.escrever({
            'ds/atoms/Botao/index.ts': BARREL_DO_BOTAO,
            'ds/index.ts': trocar(comAlias, "'./Botao'", "'./atoms/Botao'"),
          });
        },
      });

      passou(resultado);
    });

    it('falha quando a exportação explícita some e o export * passa a valer para o nome', () => {
      const resultado = executarCenario({
        base: {
          'ds/Botao.ts': BOTAO,
          'ds/Outro.ts': codigo("export const Botao = (): string => 'outro';"),
          'ds/index.ts': codigo("export { Botao } from './Botao';", "export * from './Outro';"),
        },
        depois: (repositorio) => repositorio.escrever({ 'ds/index.ts': codigo("export * from './Outro';") }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/index.ts', `Botao <- ${declaracaoDe('ds/Outro.ts', 'Botao')}`),
      );
      expect(resultado.erro).toContain(
        exportacaoPerdida('ds/index.ts', `Botao <- ${declaracaoDe('ds/Botao.ts', 'Botao')}`),
      );
    });

    it('passa quando o consumidor troca o barrel de import e export local pelo caminho direto', () => {
      const comImportEExport = codigo(
        "import { Botao } from './Botao';",
        "import { Campo } from './Campo';",
        '',
        'export { Botao, Campo };',
      );
      const resultado = executarCenario({
        base: { ...BASE_DO_DS, 'ds/index.ts': comImportEExport },
        depois: (repositorio) => {
          repositorio.mover('ds/Botao.ts', 'ds/atoms/Botao/Botao.ts');
          repositorio.escrever({
            'ds/atoms/Botao/index.ts': BARREL_DO_BOTAO,
            'ds/index.ts': trocar(comImportEExport, "'./Botao'", "'./atoms/Botao'"),
            'pages/Tela.ts': trocar(
              TELA,
              "import { Botao } from '../ds';",
              "import { Botao } from '../ds/atoms/Botao/Botao';",
            ),
          });
        },
      });

      passou(resultado);
    });

    it('passa quando o barrel importa os nomes e os exporta numa lista local', () => {
      const comImportEExport = codigo(
        "import { Botao } from './Botao';",
        "import { Campo } from './Campo';",
        '',
        'export { Botao, Campo };',
      );
      const resultado = executarCenario({
        base: { ...BASE_DO_DS, 'ds/index.ts': comImportEExport },
        depois: (repositorio) => {
          repositorio.mover('ds/Botao.ts', 'ds/atoms/Botao/Botao.ts');
          repositorio.escrever({
            'ds/atoms/Botao/index.ts': BARREL_DO_BOTAO,
            'ds/index.ts': trocar(comImportEExport, "'./Botao'", "'./atoms/Botao'"),
          });
        },
      });

      passou(resultado);
    });
  });

  describe('barrels com export *', () => {
    const BARREL_COM_ESTRELA = codigo("export * from './Botao';", "export * from './Campo';");

    const BARREL_COM_ESTRELA_DEPOIS = trocar(BARREL_COM_ESTRELA, "'./Botao'", "'./atoms/Botao'");

    const BARREL_COM_NAMESPACE = codigo(
      "export * from './Botao';",
      "export * from './Campo';",
      "export * as formato from '../lib/formato';",
    );

    const base = {
      'ds/Botao.ts': BOTAO,
      'ds/Campo.ts': CAMPO,
      'lib/formato.ts': FORMATO,
      'pages/Tela.ts': codigo("import { Botao, Campo } from '../ds';", 'export const Tela = [Botao, Campo];'),
    };

    const conferirComEstrela = (baseDoBarrel: string, novoBarrel: string): Resultado =>
      executarCenario({
        base: { ...base, 'ds/index.ts': baseDoBarrel },
        depois: (repositorio) => {
          repositorio.mover('ds/Botao.ts', 'ds/atoms/Botao/Botao.ts');
          repositorio.escrever({
            'ds/atoms/Botao/index.ts': codigo("export * from './Botao';"),
            'ds/index.ts': novoBarrel,
          });
        },
      });

    it('passa quando o export * acompanha a declaração movida', () => {
      passou(conferirComEstrela(BARREL_COM_ESTRELA, BARREL_COM_ESTRELA_DEPOIS));
    });

    it('falha quando um export * novo traz nomes que a base não exportava', () => {
      const resultado = conferirComEstrela(
        BARREL_COM_ESTRELA,
        `${BARREL_COM_ESTRELA_DEPOIS}export * from '../lib/formato';\n`,
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('ds/index.ts', `formatar <- ${declaracaoDe('lib/formato.ts', 'formatar')}`),
      );
    });

    it('falha quando um export * some do barrel', () => {
      const resultado = conferirComEstrela(BARREL_COM_ESTRELA, codigo("export * from './atoms/Botao';"));

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoPerdida('ds/index.ts', `Campo <- ${declaracaoDe('ds/Campo.ts', 'Campo')}`),
      );
    });

    it('passa quando o export * as continua apontando para o mesmo módulo', () => {
      passou(
        conferirComEstrela(
          BARREL_COM_NAMESPACE,
          trocar(BARREL_COM_NAMESPACE, "'./Botao'", "'./atoms/Botao'"),
        ),
      );
    });

    it('falha quando o export * as passa a apontar para outro módulo', () => {
      const resultado = conferirComEstrela(
        BARREL_COM_NAMESPACE,
        trocar(
          trocar(BARREL_COM_NAMESPACE, "'./Botao'", "'./atoms/Botao'"),
          "'../lib/formato'",
          "'./Campo'",
        ),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(exportacaoNova('ds/index.ts', `formato <- ${emSrc('ds/Campo.ts')}`));
      expect(resultado.erro).toContain(exportacaoPerdida('ds/index.ts', `formato <- ${emSrc('lib/formato.ts')}`));
    });

    const PREENCHIMENTO = ['export const LARGURA = 320;', 'export const ALTURA = 480;', 'export const TITULO = "x";'];

    const ESTRELA_EXTERNA = codigo("export * from 'zod';", ...PREENCHIMENTO);

    it('passa com barrels que se reexportam em ciclo', () => {
      const resultado = executarCenario({
        base: {
          'lib/a.ts': codigo("export * from './b';", 'export const A = 1;'),
          'lib/b.ts': codigo("export * from './a';", 'export const B = 2;', ...PREENCHIMENTO),
          'pages/Ciclo.ts': codigo("import { A, B } from '../lib/a';", 'export const soma = A + B;'),
        },
        depois: (repositorio) => {
          repositorio.mover('lib/b.ts', 'lib/b/b.ts');
          repositorio.escrever({
            'lib/a.ts': codigo("export * from './b/b';", 'export const A = 1;'),
            'lib/b/b.ts': codigo("export * from '../a';", 'export const B = 2;', ...PREENCHIMENTO),
          });
        },
      });

      passou(resultado);
    });

    it('falha quando o segundo export * de pacote externo passa a vir de outro pacote', () => {
      const duasEstrelas = codigo("export * from 'zod';", "export * from 'yup';", ...PREENCHIMENTO);
      const resultado = executarCenario({
        base: { 'lib/externos.ts': duasEstrelas },
        depois: (repositorio) => {
          repositorio.mover('lib/externos.ts', 'lib/externos/externos.ts');
          repositorio.escrever({ 'lib/externos/externos.ts': trocar(duasEstrelas, "'yup'", "'valibot'") });
        },
      });

      falhou(resultado);
      expect(resultado.erro).toContain('*externo:valibot');
      expect(resultado.erro).toContain('*externo:yup');
    });

    it('falha quando o export type * de pacote externo vira export *', () => {
      const tiposExternos = codigo("export type * from 'zod';", ...PREENCHIMENTO);
      const resultado = executarCenario({
        base: { 'lib/externos.ts': tiposExternos },
        depois: (repositorio) =>
          repositorio.escrever({ 'lib/externos.ts': trocar(tiposExternos, 'export type *', 'export *') }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain('exportação nova');
      expect(resultado.erro).toContain('exportação perdida');
    });

    it('falha quando o export type * vira export *', () => {
      const publico = codigo("export type * from './tipos';", ...PREENCHIMENTO);
      const resultado = executarCenario({
        base: { 'lib/tipos.ts': codigo('export type Tipo = string;'), 'lib/publico.ts': publico },
        depois: (repositorio) =>
          repositorio.escrever({ 'lib/publico.ts': trocar(publico, 'export type *', 'export *') }),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('lib/publico.ts', `Tipo <- ${declaracaoDe('lib/tipos.ts', 'Tipo')}`),
      );
      expect(resultado.erro).toContain(
        exportacaoPerdida('lib/publico.ts', `type Tipo <- ${declaracaoDe('lib/tipos.ts', 'Tipo')}`),
      );
    });

    it('passa quando o export * de pacote externo acompanha o arquivo movido', () => {
      const resultado = executarCenario({
        base: { 'lib/externos.ts': ESTRELA_EXTERNA },
        depois: (repositorio) => {
          repositorio.mover('lib/externos.ts', 'lib/externos/externos.ts');
          repositorio.escrever({ 'lib/externos/externos.ts': ESTRELA_EXTERNA });
        },
      });

      passou(resultado);
    });

    it('falha quando o export * de pacote externo passa a vir de outro pacote', () => {
      const resultado = executarCenario({
        base: { 'lib/externos.ts': ESTRELA_EXTERNA },
        depois: (repositorio) => {
          repositorio.mover('lib/externos.ts', 'lib/externos/externos.ts');
          repositorio.escrever({ 'lib/externos/externos.ts': trocar(ESTRELA_EXTERNA, "'zod'", "'zod/v4'") });
        },
      });

      falhou(resultado);
      expect(resultado.erro).toContain('exportação nova');
      expect(resultado.erro).toContain('*externo:zod/v4');
      expect(resultado.erro).toContain('exportação perdida');
      expect(resultado.erro).toContain('*externo:zod <-');
    });
  });

  describe('exportações de declarações repartidas', () => {
    const ESTADOS = codigo(
      'const LARGURA = 10;',
      'export const Lista = (): number => LARGURA;',
      "export const Resumo = (): string => 'resumo';",
    );

    const LISTA_COM_LARGURA_PRIVADA = codigo('const LARGURA = 10;', 'export const Lista = (): number => LARGURA;');

    const RESUMO = codigo("export const Resumo = (): string => 'resumo';");

    const repartirOsEstados = (lista: string): Resultado =>
      executarCenario({
        base: { 'estados.ts': ESTADOS },
        depois: (repositorio) => {
          repositorio.apagar('estados.ts');
          repositorio.escrever({ 'Lista/Lista.ts': lista, 'Resumo/Resumo.ts': RESUMO });
        },
      });

    it('passa quando a repartição mantém privado o que era privado', () => {
      passou(repartirOsEstados(LISTA_COM_LARGURA_PRIVADA));
    });

    it('passa quando variáveis declaradas juntas ou por desestruturação saem do arquivo e os imports as seguem', () => {
      const tudo = codigo(
        'export const fonte = { P: 1, Q: 2 };',
        'export const A = 1, B = 2;',
        'export const { P, Q } = fonte;',
        'export const [C, , D] = [3, 4, 5];',
      );
      const consumidor = (juntas: string, desestruturadas: string, ordenadas: string): string =>
        codigo(
          `import { A, B } from '${juntas}';`,
          `import { P, Q } from '${desestruturadas}';`,
          `import { C, D } from '${ordenadas}';`,
          '',
          'export const soma = A + B + P + Q + C + D;',
        );
      const resultado = executarCenario({
        base: { 'tudo.ts': tudo, 'usa.ts': consumidor('./tudo', './tudo', './tudo') },
        depois: (repositorio) =>
          repositorio.escrever({
            'tudo.ts': codigo('export const fonte = { P: 1, Q: 2 };'),
            'juntas.ts': codigo('export const A = 1, B = 2;'),
            'desestruturadas.ts': codigo("import { fonte } from './tudo';", '', 'export const { P, Q } = fonte;'),
            'ordenadas.ts': codigo('export const [C, , D] = [3, 4, 5];'),
            'usa.ts': consumidor('./juntas', './desestruturadas', './ordenadas'),
          }),
      });

      passou(resultado);
    });

    it('passa quando enum, interface, type, class e namespace saem do arquivo e os imports os seguem', () => {
      const nomeadas = {
        Cor: 'export enum Cor { Azul, Verde }',
        Forma: 'export interface Forma { lados: number }',
        Id: 'export type Id = string;',
        Caixa: 'export class Caixa { largura = 1; }',
        Util: 'export namespace Util { export const valor = 1; }',
      };
      const resto = 'export const RESTO = 1;';
      const consumidor = (origem: (nome: string) => string): string =>
        codigo(
          ...Object.keys(nomeadas).map((nome) => `import { ${nome} } from '${origem(nome)}';`),
          '',
          `export const todos = [${Object.keys(nomeadas).join(', ')}];`,
        );
      const resultado = executarCenario({
        base: { 'tudo.ts': codigo(...Object.values(nomeadas), resto), 'usa.ts': consumidor(() => './tudo') },
        depois: (repositorio) =>
          repositorio.escrever({
            'tudo.ts': codigo(resto),
            ...Object.fromEntries(Object.entries(nomeadas).map(([nome, texto]) => [`${nome}.ts`, codigo(texto)])),
            'usa.ts': consumidor((nome) => `./${nome}`),
          }),
      });

      passou(resultado);
    });

    it('falha quando a declaração privada passa a ser exportada sem que outro arquivo a importe', () => {
      const resultado = repartirOsEstados(trocar(LISTA_COM_LARGURA_PRIVADA, 'const LARGURA', 'export const LARGURA'));

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoNova('Lista/Lista.ts', `LARGURA <- ${declaracaoDe('Lista/Lista.ts', 'LARGURA')}`),
      );
    });

    it('falha quando a declaração exportada deixa de ser exportada', () => {
      const resultado = repartirOsEstados(
        trocar(LISTA_COM_LARGURA_PRIVADA, 'export const Lista', 'const Lista'),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoPerdida('estados.ts', `Lista <- ${declaracaoDe('Lista/Lista.ts', 'Lista')}`),
      );
    });
  });

  describe('arquivos apagados', () => {
    const BASE_COM_BARREL_SEM_CONSUMIDOR = {
      'ds/Botao.ts': BOTAO,
      'ds/index.ts': codigo("export { Botao } from './Botao';"),
    };

    it('falha quando um barrel sem consumidor é apagado', () => {
      const resultado = executarCenario({
        base: BASE_COM_BARREL_SEM_CONSUMIDOR,
        depois: (repositorio) => repositorio.apagar('ds/index.ts'),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        exportacaoPerdida('ds/index.ts', `Botao <- ${declaracaoDe('ds/Botao.ts', 'Botao')}`),
      );
    });

    it('falha quando um arquivo só com imports de efeito é apagado', () => {
      const resultado = executarCenario({
        base: { 'estilos/global.css': ESTILO_GLOBAL, 'inicio.ts': codigo("import './estilos/global.css';") },
        depois: (repositorio) => repositorio.apagar('inicio.ts'),
      });

      falhou(resultado);
      expect(resultado.erro).toContain(
        importPerdido('inicio.ts', `import de efeito <- ${emSrc('estilos/global.css')}`),
      );
    });
  });

  describe('declarações que trocam de nome pelo par explícito', () => {
    const CHAVE = codigo(
      'export function chaveDeIdempotencia(): string {',
      '  return crypto.randomUUID();',
      '}',
    );

    const USA_A_CHAVE = codigo(
      "import { chaveDeIdempotencia } from '../lib/chaveDeIdempotencia';",
      '',
      'export const LARGURA = 320;',
      'export const ALTURA = 480;',
      'export const TITULO = "chave";',
      'export const SUBTITULO = "subtitulo";',
      'export const nova = (): string => chaveDeIdempotencia();',
    );

    const pares = {
      declaracoes: [
        {
          de: { arquivo: emSrc('lib/chaveDeIdempotencia.ts'), nome: 'chaveDeIdempotencia' },
          para: { arquivo: emSrc('hooks/useChaveDeIdempotencia.ts'), nome: 'useChaveDeIdempotencia' },
        },
      ],
    };

    const conferirComConsumidor = (consumidor: string): Resultado =>
      executarCenario({
        base: { 'lib/chaveDeIdempotencia.ts': CHAVE, 'pages/Chave.ts': USA_A_CHAVE },
        depois: (repositorio) => {
          repositorio.apagar('lib/chaveDeIdempotencia.ts');
          repositorio.escrever({
            'hooks/useChaveDeIdempotencia.ts': trocar(CHAVE, 'chaveDeIdempotencia', 'useChaveDeIdempotencia'),
            'pages/Chave.ts': consumidor,
          });
        },
        pares,
      });

    it('passa quando o consumidor importa a declaração pelo nome novo', () => {
      passou(
        conferirComConsumidor(
          trocar(
            USA_A_CHAVE,
            "{ chaveDeIdempotencia } from '../lib/chaveDeIdempotencia'",
            "{ useChaveDeIdempotencia as chaveDeIdempotencia } from '../hooks/useChaveDeIdempotencia'",
          ),
        ),
      );
    });

    it('falha quando o consumidor continua importando o nome antigo do módulo novo', () => {
      const resultado = conferirComConsumidor(
        trocar(USA_A_CHAVE, "'../lib/chaveDeIdempotencia'", "'../hooks/useChaveDeIdempotencia'"),
      );

      falhou(resultado);
      expect(resultado.erro).toContain(
        importNovo(
          'pages/Chave.ts',
          `chaveDeIdempotencia <- ${declaracaoDe('hooks/useChaveDeIdempotencia.ts', 'chaveDeIdempotencia')}`,
        ),
      );
    });
  });
});
