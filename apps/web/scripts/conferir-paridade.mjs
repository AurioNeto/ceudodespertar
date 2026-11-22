import { parseArgs } from 'node:util';
import { lerMudancas } from './conferir-paridade/git.mjs';
import { conferirParidade } from './conferir-paridade/regras.mjs';

const ROTULO_DE_LIBERACAO = 'tela-alterada-pelo-dono';
const USO = `uso: node apps/web/scripts/conferir-paridade.mjs --base <ref> [--ajuda]

Compara HEAD com <ref> e acusa mudança que tira comportamento de tela já especificado. O front é a fonte
da verdade do projeto: ligar uma tela à API troca o miolo do hook de dados e mais nada (AGENTS.md).

Regras, todas ERRO:
  1. teste de tela (*.test.tsx, *.dom.test.ts, *.dom.test.tsx em apps/web/src) apagado;
  2. teste de tela que perdeu caso: título de it(...) ou test(...) que existia na base e sumiu. Renomear
     um caso conta como perda. Acrescentar caso, mexer no corpo de um caso e mover o arquivo passam;
  3. arquivo apagado dentro de apps/web/src/pages/**/components/.

Sai com 1 se houver ERRO. Com o rótulo ${ROTULO_DE_LIBERACAO} no PR (variável ROTULOS_DO_PR, lista JSON
de nomes), as ocorrências são impressas como LIBERADO e o código de saída é 0: mudar a tela é decisão do
dono, e só ele aplica o rótulo.`;

function lerOpcoes() {
  const { values } = parseArgs({
    options: { ajuda: { type: 'boolean', default: false }, base: { type: 'string' } },
    strict: true,
  });

  return values;
}

function rotulosDoPr() {
  const bruto = process.env.ROTULOS_DO_PR;
  if (bruto === undefined || bruto === '') {
    return [];
  }

  const rotulos = JSON.parse(bruto);
  return Array.isArray(rotulos) ? rotulos : [];
}

function conferir() {
  const opcoes = lerOpcoes();
  if (opcoes.ajuda) {
    console.log(USO);
    return 0;
  }
  if (opcoes.base === undefined) {
    throw new Error('informe --base <ref>');
  }

  const ocorrencias = conferirParidade(lerMudancas(opcoes.base));
  const liberado = rotulosDoPr().includes(ROTULO_DE_LIBERACAO);
  const nivel = liberado ? 'LIBERADO' : 'ERRO';

  ocorrencias.forEach(({ caminho, mensagem }) => console.log(`${nivel} ${caminho}: ${mensagem}`));
  console.log(`conferir-paridade: ${ocorrencias.length} ocorrência(s)${liberado ? `, liberadas pelo rótulo ${ROTULO_DE_LIBERACAO}` : ''}`);

  return ocorrencias.length > 0 && !liberado ? 1 : 0;
}

try {
  process.exitCode = conferir();
} catch (erro) {
  console.error(`conferir-paridade: ${erro.message}`);
  process.exitCode = 1;
}
