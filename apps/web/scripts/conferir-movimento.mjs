import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { conferirMovimento } from './conferir-movimento/conferencia.mjs';
import { abrirRepositorio } from './conferir-movimento/git.mjs';

const BASE_PADRAO = 'origin/main';
const TAMANHO_DO_SHA_CURTO = 10;
const USO = `uso: node scripts/conferir-movimento.mjs [--base <ref>] [--pares <arquivo.json>]

Compara o HEAD com o merge-base da base (padrão ${BASE_PADRAO}) em apps/web/src e prova que a
mudança é só de caminho: renomeações sem diferença fora das linhas de import e de export ... from,
declarações de topo repartidas com o mesmo nome e o mesmo hash de corpo, nenhuma declaração nova.

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

function resumo({ arquivosNaDiferenca, renomeacoes, repartidas, barrels }) {
  const declaracoes = repartidas.reduce((total, { nomes }) => total + nomes.length, 0);

  return [
    `${arquivosNaDiferenca} arquivos na diferença`,
    `${renomeacoes.length} renomeações`,
    `${declaracoes} declarações repartidas`,
    `${barrels.length} barrels novos`,
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
