import {
  alvoDeDeclaracao,
  alvoDeModulo,
  chaveDaLigacao,
  chaveDoAlvo,
  descreverAlvo,
} from './alvos.mjs';
import { lerLigacoes } from './ligacoes.mjs';

const SEPARADOR_DA_CHAVE = '\0';
const ROTULO_DA_EXPORTACAO = 'exportação';
const ROTULO_DO_IMPORT = 'ligação de import';
const ROTULO_DA_REFERENCIA = 'referência de módulo';

const chaveDeSimbolo = (arquivo, simbolo) => `${arquivo}${SEPARADOR_DA_CHAVE}${simbolo}`;

const rotuloDaCategoria = (categoria) => {
  switch (categoria) {
    case 'exportacao':
      return ROTULO_DA_EXPORTACAO;
    case 'especificador':
      return ROTULO_DA_REFERENCIA;
    default:
      return ROTULO_DO_IMPORT;
  }
};

function descreverLigacao({ categoria, apenasTipo, nome, alvo }) {
  const origem = descreverAlvo(alvo);

  switch (categoria) {
    case 'efeito':
      return `import de efeito <- ${origem}`;
    case 'especificador':
      return `import(), import type ou vi.mock <- ${origem}`;
    default:
      return `${apenasTipo ? 'type ' : ''}${nome} <- ${origem}`;
  }
}

function criarMapeador(renomeacoes, correspondencias) {
  const renomeados = new Map(renomeacoes.map(({ de, para }) => [de, para]));
  const movidas = new Map(
    correspondencias.flatMap(({ origem, destino }) =>
      origem.simbolos.map((simbolo, indice) => [
        chaveDeSimbolo(origem.arquivo, simbolo),
        alvoDeDeclaracao(destino.arquivo, destino.simbolos[indice] ?? simbolo),
      ]),
    ),
  );
  const noHead = (arquivo) => renomeados.get(arquivo) ?? arquivo;

  return (alvo) => {
    switch (alvo.tipo) {
      case 'declaracao':
        return (
          movidas.get(chaveDeSimbolo(alvo.arquivo, alvo.nome)) ??
          alvoDeDeclaracao(noHead(alvo.arquivo), alvo.nome)
        );
      case 'modulo':
        return alvoDeModulo(noHead(alvo.arquivo));
      default:
        return alvo;
    }
  };
}

function acrescentar(mapa, chave, valor) {
  mapa.set(chave, new Set([...(mapa.get(chave) ?? []), valor]));
}

const apagadosDaBase = (entradas) =>
  entradas.filter(({ para }) => para === null).map(({ de }) => de);

function relacionarArquivos({ base, head, entradas, correspondencias }) {
  const origens = new Map();
  const destinos = new Map(apagadosDaBase(entradas).map((arquivo) => [arquivo, new Set()]));
  const ligar = (de, para) => {
    acrescentar(origens, para, de);
    acrescentar(destinos, de, para);
  };
  const comOsDoisLados = entradas.filter(({ de, para }) => de !== null && para !== null);

  comOsDoisLados.forEach(({ de, para }) => ligar(de, para));
  [...base.codigos]
    .filter((arquivo) => head.codigos.has(arquivo))
    .forEach((arquivo) => ligar(arquivo, arquivo));
  correspondencias.forEach(({ origem, destino }) => ligar(origem.arquivo, destino.arquivo));

  return { origens, destinos };
}

const ligacoesDe = (leitura, arquivo) => [
  ...leitura.importacoes(arquivo),
  ...leitura.exportacoes(arquivo),
];

const chavesDe = (ligacoes) => new Set(ligacoes.map(chaveDaLigacao));

function mapearLigacao(mapear, ligacao) {
  const alvo = mapear(ligacao.alvo);
  const exportadaComONomeDaDeclaracao =
    ligacao.categoria === 'exportacao' && ligacao.nome === ligacao.alvo.nome;

  return { ...ligacao, nome: exportadaComONomeDaDeclaracao ? alvo.nome : ligacao.nome, alvo };
}

function importadasNoHead(head) {
  const alvos = [...head.codigos].flatMap((arquivo) => head.importacoes(arquivo));

  return new Set(alvos.map(({ alvo }) => chaveDoAlvo(alvo)));
}

function declaracoesLocaisDaBase({ base, mapear }, origens) {
  return new Map(
    [...origens].flatMap((origem) =>
      [...base.locais(origem)].map(([nome, alvo]) => [nome, chaveDoAlvo(mapear(alvo))]),
    ),
  );
}

function ligacoesNovasDoArquivo(contexto, arquivo, origens) {
  const { base, head, mapear, alvosImportados } = contexto;
  const esperadas = chavesDe(
    [...origens].flatMap((origem) =>
      ligacoesDe(base, origem).map((ligacao) => mapearLigacao(mapear, ligacao)),
    ),
  );
  const locais = declaracoesLocaisDaBase(contexto, origens);
  const vemDeDeclaracaoLocal = ({ categoria, nome, alvo }) =>
    categoria === 'importacao' && locais.get(nome) === chaveDoAlvo(alvo);
  const exportacaoNecessariaAoImport = ({ categoria, alvo }) =>
    categoria === 'exportacao' && alvo.arquivo === arquivo && alvosImportados().has(chaveDoAlvo(alvo));

  return ligacoesDe(head, arquivo).filter(
    (ligacao) =>
      !esperadas.has(chaveDaLigacao(ligacao)) &&
      !vemDeDeclaracaoLocal(ligacao) &&
      !exportacaoNecessariaAoImport(ligacao),
  );
}

function ligacoesPerdidasDoArquivo({ base, head, mapear }, arquivo, destinos) {
  const encontradas = chavesDe([...destinos].flatMap((destino) => ligacoesDe(head, destino)));

  return ligacoesDe(base, arquivo)
    .map((ligacao) => mapearLigacao(mapear, ligacao))
    .filter((ligacao) => !encontradas.has(chaveDaLigacao(ligacao)));
}

function ligacoesNovasDoBarrel({ base, head, mapear }, barrel) {
  const esperadas = chavesDe(
    [...base.codigos].flatMap((arquivo) =>
      base.exportacoes(arquivo).map((ligacao) => mapearLigacao(mapear, ligacao)),
    ),
  );

  return head.exportacoes(barrel).filter((ligacao) => !esperadas.has(chaveDaLigacao(ligacao)));
}

function registrarLigacoes(registrar, situacao, arquivo, ligacoes) {
  for (const ligacao of ligacoes) {
    registrar(
      `${rotuloDaCategoria(ligacao.categoria)} ${situacao}: ${arquivo}: ${descreverLigacao(ligacao)}`,
      arquivo,
    );
  }
}

export function conferirLigacoes({
  repositorio,
  entradas,
  renomeacoes,
  correspondencias,
  barrels,
  registrar,
}) {
  const base = lerLigacoes(repositorio.arvoreDaBase);
  const head = lerLigacoes(repositorio.arvoreDoHead);
  const mapear = criarMapeador(renomeacoes, correspondencias);
  const { origens, destinos } = relacionarArquivos({ base, head, entradas, correspondencias });
  const alvosImportados = memoizarUmaVez(() => importadasNoHead(head));
  const contexto = { base, head, mapear, alvosImportados };

  for (const [arquivo, deOnde] of origens) {
    registrarLigacoes(registrar, 'nova', arquivo, ligacoesNovasDoArquivo(contexto, arquivo, deOnde));
  }

  for (const [arquivo, paraOnde] of destinos) {
    registrarLigacoes(
      registrar,
      'perdida',
      arquivo,
      ligacoesPerdidasDoArquivo(contexto, arquivo, paraOnde),
    );
  }

  for (const barrel of barrels) {
    registrarLigacoes(registrar, 'nova', barrel, ligacoesNovasDoBarrel(contexto, barrel));
  }

  const conferidas = [...origens.keys(), ...barrels].map((arquivo) => ligacoesDe(head, arquivo));

  return conferidas.reduce((total, ligacoes) => total + ligacoes.length, 0);
}

function memoizarUmaVez(calcular) {
  let calculado;

  return () => {
    calculado ??= calcular();

    return calculado;
  };
}
