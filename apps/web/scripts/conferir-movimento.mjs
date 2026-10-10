import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { conferirMovimento } from './conferir-movimento/conferencia.mjs';
import { abrirRepositorio } from './conferir-movimento/git.mjs';

const BASE_PADRAO = 'origin/main';
const TAMANHO_DO_SHA_CURTO = 10;
const USO = `uso: node scripts/conferir-movimento.mjs [--base <ref>] [--pares <arquivo.json>]

Compara o HEAD com o merge-base da base (padrão ${BASE_PADRAO}) em apps/web/src, só pelos commits, e prova
que a mudança é só de caminho. Falha com saída 1 se houver mudança não commitada em apps/web/src
(git status --porcelain), porque o que não foi commitado não entra na comparação.

Provado, com a leitura feita pelo compilador do TypeScript:
  1. renomeações sem diferença de conteúdo fora das linhas de import e de export ... from, com cada
     import(), import type e vi.mock apontando para o mesmo módulo dentro da mesma declaração;
  2. declarações de topo repartidas entre arquivos com o mesmo nome e o mesmo hash de corpo, sem
     declaração nova nem perdida (o modificador export não entra no hash; o módulo alvo de cada import(),
     import type e vi.mock da declaração entra); o que fica no mesmo arquivo mantém a ordem;
  3. cada ligação de import (nome, alias, type, namespace, efeito, require) e cada referência de módulo
     (import(), import type, vi.mock) continua apontando para a mesma declaração ou módulo, resolvida
     pelo tsconfig do web, seguindo reexports e passando pelo mapa de renomeações e repartições; o
     arquivo apagado que não deixou destino perde as suas ligações, e isso é acusado; import { type X }
     conta como import de efeito, porque com verbatimModuleSyntax ele emite import {} from, e por isso
     difere de import type { X };
  4. cada arquivo exporta os mesmos nomes (barrels incluídos) apontando para as mesmas declarações;
     uma declaração privada só passa a ser exportada se outro arquivo do HEAD a importa; um barrel
     só ganha nome de declaração que saiu do seu arquivo na etapa e que a base já exportava;
  5. o index.ts novo só reexporta nomes que a base já exportava, com o mesmo alvo.

Arquivo que não é código tem de manter os bytes: trocar o caminho de um @import de css falha.

Não provado: a ordem das linhas de import e de export ... from; comentários que acompanham essas linhas
ou que ficam fora do corpo de declarações repartidas; a ligação por import de css e por alias não
resolvido, que compara o texto do caminho; import() e vi.mock com argumento
que não é literal, require() fora de import x = require(), import.meta.glob; ajudante de teste repetido
e idêntico a um ajudante de teste da base, em arquivo de teste movido; export { type X } from no lugar de
export type { X } from, que também emite export {} from; o comportamento em tempo de execução e tudo
fora de apps/web/src.

--pares aponta um JSON com renomes que trocam de nome, que a similaridade do git pode não casar:
{
  "arquivos": [{ "de": "apps/web/src/a.ts", "para": "apps/web/src/b/c.ts" }],
  "declaracoes": [
    {
      "de": { "arquivo": "apps/web/src/a.ts", "nome": "antigo" },
      "para": { "arquivo": "apps/web/src/b/c.ts", "nome": "novo" }
    }
  ]
}`;

function lerOpcoes() {
  const { values } = parseArgs({
    options: {
      base: { type: 'string', default: BASE_PADRAO },
      pares: { type: 'string' },
      ajuda: { type: 'boolean', default: false },
    },
    strict: true,
  });

  return values;
}

const lerPares = (arquivo) => (arquivo ? JSON.parse(readFileSync(arquivo, 'utf8')) : {});

const encurtar = (sha) => sha.slice(0, TAMANHO_DO_SHA_CURTO);

function linhasConferidas({ renomeacoes, repartidas, barrels }) {
  const linhaDeBarrels =
    barrels.length > 0 ? [`barrels novos só com export ... from: ${barrels.join(', ')}`] : [];

  return [
    ...renomeacoes.map(({ de, para }) => `renomeação: ${de} -> ${para}`),
    ...repartidas.map(
      ({ de, para, nomes }) => `declarações repartidas: ${de} -> ${para}: ${nomes.join(', ')}`,
    ),
    ...linhaDeBarrels,
  ];
}

function resumo({ arquivosNaDiferenca, renomeacoes, repartidas, barrels, ligacoes }) {
  const declaracoes = repartidas.reduce((total, { nomes }) => total + nomes.length, 0);

  return [
    `${arquivosNaDiferenca} arquivos na diferença`,
    `${renomeacoes.length} renomeações`,
    `${declaracoes} declarações repartidas`,
    `${barrels.length} barrels novos`,
    `${ligacoes} ligações conferidas`,
  ].join(', ');
}

function conferir() {
  const opcoes = lerOpcoes();

  if (opcoes.ajuda) {
    console.log(USO);
    return 0;
  }

  const repositorio = abrirRepositorio(opcoes.base);
  const resultado = conferirMovimento(repositorio, lerPares(opcoes.pares));
  linhasConferidas(resultado).forEach((linha) => console.log(linha));

  if (resultado.diferencas.length > 0) {
    resultado.diferencas.forEach(({ mensagem }) => console.error(`DIFERENÇA ${mensagem}`));
    console.error(
      `conferir-movimento: ${resultado.diferencas.length} diferenças contra ${encurtar(repositorio.base)}`,
    );
    return 1;
  }

  console.log(
    resultado.arquivosNaDiferenca === 0
      ? `conferir-movimento: nada a conferir em apps/web/src (base ${encurtar(repositorio.base)})`
      : `conferir-movimento: ok, ${resumo(resultado)} (base ${encurtar(repositorio.base)})`,
  );
  return 0;
}

try {
  process.exitCode = conferir();
} catch (erro) {
  console.error(`conferir-movimento: ${erro.message}`);
  process.exitCode = 1;
}
