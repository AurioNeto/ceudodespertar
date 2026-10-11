import { posix } from 'node:path';
import { ehPascalCase } from './arvore.mjs';
import { aviso, erro } from './ocorrencias.mjs';

const EXTENSAO_DE_COMPONENTE = '.tsx';
const ARQUIVO_DE_TESTE = /\.test\.tsx?$/;
const PASTA_DO_APOIO_GLOBAL_DE_TESTE = 'testes/';

function conferirUnidade(arvore, unidade) {
  const nome = posix.basename(unidade);
  const falta = (arquivo) => !arvore.existe(posix.join(unidade, arquivo));
  const teste = `${nome}.dom.test.tsx`;

  return [
    ...[`${nome}${EXTENSAO_DE_COMPONENTE}`, 'index.ts']
      .filter(falta)
      .map((arquivo) => erro(unidade, `unidade sem ${arquivo}`)),
    ...(falta(teste) ? [aviso(unidade, `unidade sem ${teste} (aviso até o fim da migração)`)] : []),
  ];
}

const ehDeProducao = (arquivo) =>
  !ARQUIVO_DE_TESTE.test(arquivo) && !arquivo.startsWith(PASTA_DO_APOIO_GLOBAL_DE_TESTE);

const ehComponente = (arquivo) =>
  arquivo.endsWith(EXTENSAO_DE_COMPONENTE) && ehPascalCase(arquivo) && ehDeProducao(arquivo);

const estaNaPropriaUnidade = (arquivo) =>
  posix.basename(posix.dirname(arquivo)) === posix.basename(arquivo, EXTENSAO_DE_COMPONENTE);

function conferirComponenteSolto(arquivo) {
  const nome = posix.basename(arquivo, EXTENSAO_DE_COMPONENTE);

  return estaNaPropriaUnidade(arquivo)
    ? []
    : [erro(arquivo, `componente fora de ${nome}/${nome}${EXTENSAO_DE_COMPONENTE}`)];
}

export function conferirUnidades(arvore) {
  const unidades = arvore.pastas.filter(ehPascalCase);
  const componentes = arvore.arquivos.filter(ehComponente);

  return {
    unidades: unidades.length,
    componentes: componentes.length,
    ocorrencias: [
      ...unidades.flatMap((unidade) => conferirUnidade(arvore, unidade)),
      ...componentes.flatMap(conferirComponenteSolto),
    ],
  };
}
