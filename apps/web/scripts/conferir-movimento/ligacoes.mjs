import { ehCodigo, lerArquivo, nomesDeclarados } from './declaracoes.mjs';
import { alvoDeDeclaracao, ligacao } from './alvos.mjs';
import { exportacoesDoArquivo } from './exportacoes.mjs';
import { importacoesDoArquivo } from './importacoes.mjs';
import { criarResolvedor } from './resolucao.mjs';

function memoizar(calcular, valorEmAndamento) {
  const cache = new Map();

  return (arquivo) => {
    if (!cache.has(arquivo)) {
      cache.set(arquivo, valorEmAndamento);
      cache.set(arquivo, calcular(arquivo));
    }

    return cache.get(arquivo);
  };
}

function locaisDoArquivo(leitor, arquivo) {
  const nomes = leitor.fonte(arquivo).statements.flatMap(nomesDeclarados);

  return new Map(nomes.map((nome) => [nome, alvoDeDeclaracao(arquivo, nome)]));
}

export function lerLigacoes(arvore) {
  const codigos = new Set([...arvore.arquivos].filter(ehCodigo));
  const conteudos = arvore.conteudos([...codigos]);
  const leitor = { resolver: criarResolvedor(arvore) };
  const doCodigo = (calcular, vazio) => (arquivo) => (codigos.has(arquivo) ? calcular(arquivo) : vazio);

  leitor.fonte = memoizar((arquivo) => lerArquivo(arquivo, conteudos.get(arquivo).toString('utf8')));
  leitor.importacoes = doCodigo(
    memoizar((arquivo) => importacoesDoArquivo(leitor, arquivo), []),
    [],
  );
  leitor.exportacoesPorNome = doCodigo(
    memoizar((arquivo) => exportacoesDoArquivo(leitor, arquivo), new Map()),
    new Map(),
  );

  const exportacoes = (arquivo) =>
    [...leitor.exportacoesPorNome(arquivo)].map(([nome, { alvo, apenasTipo }]) =>
      ligacao('exportacao', nome, apenasTipo, alvo),
    );
  const locais = (arquivo) => locaisDoArquivo(leitor, arquivo);

  return {
    codigos,
    importacoes: leitor.importacoes,
    exportacoes,
    locais: doCodigo(memoizar(locais, new Map()), new Map()),
  };
}
