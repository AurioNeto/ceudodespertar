import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { lerArvore } from './conferir-estrutura/arvore.mjs';
import { conferirFluxos } from './conferir-estrutura/fluxos.mjs';
import { AVISO, ERRO } from './conferir-estrutura/ocorrencias.mjs';
import { conferirTelas } from './conferir-estrutura/telas.mjs';
import { conferirUnidades } from './conferir-estrutura/unidades.mjs';

const RAIZ_DO_SRC = fileURLToPath(new URL('../src', import.meta.url));
const SRC_NO_REPOSITORIO = 'apps/web/src';
const USO = `uso: node apps/web/scripts/conferir-estrutura.mjs [--ajuda]

Confere a estrutura de ${SRC_NO_REPOSITORIO} pelo sistema de arquivos e pelo texto dos arquivos (Documento 8,
seção 12.4). Imprime uma linha ERRO ou AVISO por ocorrência, os erros primeiro, e uma linha final com os
totais. Sai com 1 se houver ERRO; AVISO não muda o código de saída.

Regras:
  1. toda pasta PascalCase é unidade e tem <Nome>.tsx e index.ts (ERRO). Sem <Nome>.dom.test.tsx é AVISO:
     a regra de unidade com teste está suspensa durante a migração (seções 8.1 e 13.7);
  2. todo .tsx PascalCase de produção (fora de *.test.tsx e de testes/) fica em <Nome>/<Nome>.tsx (ERRO).
     main.tsx e router.tsx não são PascalCase e ficam de fora;
  3. o módulo de cada tela de TELAS (app/shell/telas.ts) é o prefixo da primeira permissão dela, ou
     transversal quando não há permissão, e é a pasta de módulo (pages/<modulo>/) da página que o router
     (app/router.tsx) importa para o element da rota da tela (ERRO). Primeira permissão que não é texto
     literal, ou element que não é um componente importado de pages/, é AVISO de não determinável;
  4. todo fluxo (pages/<modulo>/<fluxo>/, pasta minúscula que não é components, hooks, utils nem mocks)
     tem pasta de tipo compartilhada: components/, hooks/, utils/, mocks/ ou constantes.ts (ERRO);
  5. toda RotaId (chave de ROTAS em app/rotas/rotas.ts) tem caminho literal, item em TELAS e elemento no
     router, um objeto com path: ROTAS.<id> e element (ERRO).

Não confere: se a pasta de tipo do fluxo é usada por duas ou mais telas dele (a regra do ancestral comum,
seção 6.1, não tem verificador); rota declarada sem element (lazy, Component); as rotas públicas, fora de
RotaId; e o que o typecheck já garante (TELAS com chave que não é RotaId, ROTAS.<id> inexistente).`;

function lerOpcoes() {
  const { values } = parseArgs({
    options: { ajuda: { type: 'boolean', default: false } },
    strict: true,
  });

  return values;
}

const linhaDa = ({ nivel, caminho, mensagem }) =>
  `${nivel} ${posix.join(SRC_NO_REPOSITORIO, caminho)}: ${mensagem}`;

const doNivel = (ocorrencias, nivel) => ocorrencias.filter((ocorrencia) => ocorrencia.nivel === nivel);

function totais({ erros, avisos, unidades, fluxos, telas }) {
  const conferidos = [
    `${unidades.unidades} unidades`,
    `${unidades.componentes} componentes`,
    `${fluxos.fluxos} fluxos`,
    `${telas.telas} telas`,
    `${telas.rotas} rotas`,
  ].join(', ');

  return `conferir-estrutura: ${erros.length} ${ERRO}, ${avisos.length} ${AVISO} (${conferidos})`;
}

function conferir() {
  if (lerOpcoes().ajuda) {
    console.log(USO);
    return 0;
  }

  const arvore = lerArvore(RAIZ_DO_SRC);
  const unidades = conferirUnidades(arvore);
  const fluxos = conferirFluxos(arvore);
  const telas = conferirTelas(arvore);
  const ocorrencias = [...unidades.ocorrencias, ...fluxos.ocorrencias, ...telas.ocorrencias];
  const erros = doNivel(ocorrencias, ERRO);
  const avisos = doNivel(ocorrencias, AVISO);

  [...erros, ...avisos].forEach((ocorrencia) => console.log(linhaDa(ocorrencia)));
  console.log(totais({ erros, avisos, unidades, fluxos, telas }));

  return erros.length > 0 ? 1 : 0;
}

try {
  process.exitCode = conferir();
} catch (erro) {
  console.error(`conferir-estrutura: ${erro.message}`);
  process.exitCode = 1;
}
