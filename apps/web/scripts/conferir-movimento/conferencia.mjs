import { criarAlvosDosEspecificadores } from './alvosDosEspecificadores.mjs';
import { conferirLigacoes } from './conferenciaDeLigacoes.mjs';
import { conteudoComparavel, declaracoesDe, ehBarrel, ehCodigo } from './declaracoes.mjs';
import { criarResolvedor } from './resolucao.mjs';

const SEPARADOR_DA_CHAVE = '\0';

const chaveDe = (item) => `${item.nome}${SEPARADOR_DA_CHAVE}${item.hash}`;
const ehAjudanteDeTeste = (item) => item.emTeste && !item.chamadaDeTeste;
const ehRenomeacao = (entrada) =>
  entrada.de !== null && entrada.para !== null && entrada.de !== entrada.para;
const apagado = (de) => ({ de, para: null });
const novo = (para) => ({ de: null, para });
const caminhoDe = (entrada) => entrada.para ?? entrada.de;
const comoTexto = (conteudo) => conteudo.toString('utf8');
const rotuloDaDeclaracao = ({ nome, arquivo }) => `${nome} (${arquivo})`;
const porCaminho = (a, b) => caminhoDe(a).localeCompare(caminhoDe(b));

function agruparPor(itens, chaveDoItem) {
  const grupos = new Map();

  for (const item of itens) {
    grupos.set(chaveDoItem(item), [...(grupos.get(chaveDoItem(item)) ?? []), item]);
  }

  return grupos;
}

const agruparPorChave = (itens) => agruparPor(itens, chaveDe);

const parDeArquivoValido = (repositorio, { de, para }) =>
  repositorio.existeNaBase(de) &&
  !repositorio.existeNoHead(de) &&
  repositorio.existeNoHead(para) &&
  !repositorio.existeNaBase(para);

function separarOQueToca(entradas, par) {
  const tocaOPar = (entrada) =>
    ehRenomeacao(entrada) && (entrada.de === par.de || entrada.para === par.para);

  return entradas
    .flatMap((entrada) => (tocaOPar(entrada) ? [apagado(entrada.de), novo(entrada.para)] : [entrada]))
    .filter(
      (entrada) =>
        !(entrada.para === null && entrada.de === par.de) &&
        !(entrada.de === null && entrada.para === par.para),
    );
}

function incorporarParesDeArquivo(repositorio, entradas, pares, registrar) {
  return pares.reduce((atuais, par) => {
    if (!parDeArquivoValido(repositorio, par)) {
      registrar(
        `par de renomeação sem correspondência entre a base e o HEAD: ${par.de} -> ${par.para}`,
        par.de,
        par.para,
      );
      return atuais;
    }

    return [...separarOQueToca(atuais, par), { de: par.de, para: par.para, explicito: true }];
  }, entradas);
}

const temOMesmoConteudo = (leitor, { de, para }) =>
  conteudoComparavel(de, leitor.conteudoDaBase(de), leitor.alvoNaBase) ===
  conteudoComparavel(para, leitor.conteudoDoHead(para), leitor.alvoNoHead);

function mensagemDeArquivoQueNaoEhCodigo(entrada) {
  if (entrada.de === null) {
    return `arquivo novo sem origem: ${entrada.para}`;
  }

  return entrada.para === null
    ? `arquivo que não é código foi apagado sem renomeação: ${entrada.de}`
    : `arquivo que não é código foi alterado: ${entrada.para}`;
}

function lerEntrada(leitor, entrada) {
  const itensDe = (caminho, conteudoDe, alvoDoEspecificador) =>
    declaracoesDe(caminho, comoTexto(conteudoDe(caminho)), alvoDoEspecificador);

  return {
    entrada,
    base:
      entrada.de === null ? [] : itensDe(entrada.de, leitor.conteudoDaBase, leitor.alvoNaBase),
    head:
      entrada.para === null ? [] : itensDe(entrada.para, leitor.conteudoDoHead, leitor.alvoNoHead),
  };
}

const estaEmOrdemCrescente = (indices) =>
  indices.every((indice, posicao) => posicao === 0 || indice > indices[posicao - 1]);

function casarNoLugar({ base, head }) {
  const disponiveis = agruparPorChave(base);
  const casadosDaBase = new Set();
  const casadosDoHead = new Set();
  const posicoesNaBase = [];

  for (const item of head) {
    const candidato = disponiveis.get(chaveDe(item))?.shift();

    if (candidato) {
      casadosDaBase.add(candidato);
      casadosDoHead.add(item);
      posicoesNaBase.push(base.indexOf(candidato));
    }
  }

  return {
    livresDaBase: base.filter((item) => !casadosDaBase.has(item)),
    livresDoHead: head.filter((item) => !casadosDoHead.has(item)),
    mudouDeOrdem: !estaEmOrdemCrescente(posicoesNaBase),
  };
}

function declaracoesDivergem(leitor, entrada) {
  const { livresDaBase, livresDoHead } = casarNoLugar(lerEntrada(leitor, entrada));

  return livresDaBase.length > 0 || livresDoHead.length > 0;
}

const podeSerComparadaPorDeclaracao = (leitor, entrada) =>
  !entrada.explicito &&
  ehCodigo(entrada.de) &&
  ehCodigo(entrada.para) &&
  declaracoesDivergem(leitor, entrada);

function casarParesDeDeclaracao(pares, { baseLivre, headLivre, casar, registrar }) {
  const localizar = (livres, { arquivo, nome }) =>
    [...livres].find((item) => item.arquivo === arquivo && item.nome === nome);

  for (const { de, para } of pares) {
    const origem = localizar(baseLivre, de);
    const destino = localizar(headLivre, para);

    if (!origem || !destino) {
      registrar(
        `par de declaração sem correspondência: ${rotuloDaDeclaracao(de)} -> ${rotuloDaDeclaracao(para)}`,
        de.arquivo,
        para.arquivo,
      );
    } else if (origem.hash === destino.hash) {
      casar(origem, destino);
    } else {
      baseLivre.delete(origem);
      headLivre.delete(destino);
      registrar(
        `corpo mudou: ${rotuloDaDeclaracao(de)} -> ${rotuloDaDeclaracao(para)}`,
        de.arquivo,
        para.arquivo,
      );
    }
  }
}

function casarPorChave({ baseLivre, headLivre, casar }) {
  const disponiveis = agruparPorChave(baseLivre);

  for (const destino of headLivre) {
    const origem = disponiveis.get(chaveDe(destino))?.shift();

    if (origem) {
      casar(origem, destino);
    }
  }
}

function casarAjudantesDeTesteRepetidos(todasDaBase, { headLivre, casar }) {
  const ajudantes = agruparPorChave(todasDaBase.filter(ehAjudanteDeTeste));

  for (const destino of [...headLivre].filter(ehAjudanteDeTeste)) {
    const origem = ajudantes.get(chaveDe(destino))?.[0];

    if (origem) {
      casar(origem, destino);
    }
  }
}

function casarDeclaracoes(leitor, entradas, paresDeDeclaracao, registrar) {
  const lidas = entradas.map((entrada) => lerEntrada(leitor, entrada));
  const baseLivre = new Set();
  const headLivre = new Set();
  const correspondencias = [];

  for (const lida of lidas) {
    const { livresDaBase, livresDoHead, mudouDeOrdem } = casarNoLugar(lida);

    if (mudouDeOrdem) {
      registrar(`ordem dos statements de topo mudou: ${lida.entrada.para}`, lida.entrada.para);
    }

    livresDaBase.forEach((item) => baseLivre.add(item));
    livresDoHead.forEach((item) => headLivre.add(item));
  }

  const casar = (origem, destino) => {
    baseLivre.delete(origem);
    headLivre.delete(destino);
    correspondencias.push({ origem, destino });
  };
  const contexto = { baseLivre, headLivre, casar, registrar };

  casarParesDeDeclaracao(paresDeDeclaracao, contexto);
  casarPorChave(contexto);
  casarAjudantesDeTesteRepetidos(
    lidas.flatMap(({ base }) => base),
    contexto,
  );

  return { correspondencias, baseLivre, headLivre };
}

function acusarCorposAlterados({ baseLivre, headLivre, registrar }) {
  const arquivosDeDestino = new Set();

  for (const perdida of baseLivre) {
    const alterada = [...headLivre].find((item) => item.nome === perdida.nome);

    if (alterada) {
      baseLivre.delete(perdida);
      headLivre.delete(alterada);
      arquivosDeDestino.add(alterada.arquivo);
      registrar(
        `corpo mudou: ${perdida.nome} (${perdida.arquivo} -> ${alterada.arquivo})`,
        perdida.arquivo,
        alterada.arquivo,
      );
    }
  }

  return arquivosDeDestino;
}

function acusarArquivosNovosSemOrigem({ novos, comOrigem, headLivre, repositorio, registrar }) {
  const ehBarrelNovo = (caminho) => ehBarrel(caminho, repositorio.conteudoDoHead(caminho));
  const barrels = novos.filter(ehBarrelNovo);
  const semOrigem = novos.filter((caminho) => !barrels.includes(caminho) && !comOrigem.has(caminho));

  for (const caminho of semOrigem) {
    const itens = [...headLivre].filter((item) => item.arquivo === caminho);
    const nomes = itens.map(({ nome }) => nome).join(', ');
    const declaracoes = itens.length > 0 ? ` (declarações: ${nomes})` : '';
    itens.forEach((item) => headLivre.delete(item));
    registrar(`arquivo novo sem origem: ${caminho}${declaracoes}`, caminho);
  }

  return barrels;
}

function acusarDeclaracoesPerdidasENovas({ baseLivre, headLivre, registrar }) {
  for (const perdida of baseLivre) {
    registrar(`declaração perdida: ${perdida.nome} (${perdida.arquivo})`, perdida.arquivo);
  }

  for (const nova of headLivre) {
    registrar(`declaração nova: ${nova.nome} (${nova.arquivo})`, nova.arquivo);
  }
}

function agruparRepartidas(correspondencias) {
  const grupos = agruparPor(
    correspondencias,
    ({ origem, destino }) => `${origem.arquivo}${SEPARADOR_DA_CHAVE}${destino.arquivo}`,
  );

  return [...grupos.values()].map((grupo) => ({
    de: grupo[0].origem.arquivo,
    para: grupo[0].destino.arquivo,
    nomes: grupo.map(({ origem, destino }) =>
      origem.nome === destino.nome ? destino.nome : `${destino.nome} (era ${origem.nome})`,
    ),
  }));
}

export function conferirMovimento(repositorio, pares = {}) {
  const diferencas = [];
  const registrar = (mensagem, ...arquivos) => diferencas.push({ mensagem, arquivos });
  const entradas = incorporarParesDeArquivo(
    repositorio,
    repositorio.entradas().toSorted(porCaminho),
    pares.arquivos ?? [],
    registrar,
  );
  const renomeacoes = entradas.filter(ehRenomeacao);
  const resolvedores = {
    base: criarResolvedor(repositorio.arvoreDaBase),
    head: criarResolvedor(repositorio.arvoreDoHead),
  };
  const leitor = { ...repositorio, ...criarAlvosDosEspecificadores(resolvedores, renomeacoes) };
  const puras = renomeacoes.filter((renomeacao) => temOMesmoConteudo(leitor, renomeacao));
  const impuras = renomeacoes.filter((renomeacao) => !puras.includes(renomeacao));
  const porDeclaracao = impuras.filter((renomeacao) =>
    podeSerComparadaPorDeclaracao(leitor, renomeacao),
  );

  impuras
    .filter((renomeacao) => !porDeclaracao.includes(renomeacao))
    .forEach(({ de, para }) =>
      registrar(`renomeação com diferença fora das linhas de import: ${de} -> ${para}`, de, para),
    );

  const aComparar = [...entradas.filter((entrada) => !ehRenomeacao(entrada)), ...porDeclaracao];
  const semCodigo = aComparar.filter((entrada) => !ehCodigo(caminhoDe(entrada)));
  semCodigo.forEach((entrada) =>
    registrar(mensagemDeArquivoQueNaoEhCodigo(entrada), caminhoDe(entrada)),
  );
  const deCodigo = aComparar.filter((entrada) => !semCodigo.includes(entrada));

  const { correspondencias, baseLivre, headLivre } = casarDeclaracoes(
    leitor,
    deCodigo,
    pares.declaracoes ?? [],
    registrar,
  );
  const comOrigem = new Set([
    ...correspondencias.map(({ destino }) => destino.arquivo),
    ...acusarCorposAlterados({ baseLivre, headLivre, registrar }),
  ]);
  const barrels = acusarArquivosNovosSemOrigem({
    novos: deCodigo.filter(({ de }) => de === null).map(({ para }) => para),
    comOrigem,
    headLivre,
    repositorio,
    registrar,
  });
  acusarDeclaracoesPerdidasENovas({ baseLivre, headLivre, registrar });
  const ligacoes = conferirLigacoes({
    repositorio,
    resolvedores,
    entradas,
    renomeacoes,
    correspondencias,
    barrels,
    registrar,
  });

  const arquivosComDiferenca = new Set(diferencas.flatMap(({ arquivos }) => arquivos));
  const conferidas = [...puras, ...porDeclaracao].filter(
    ({ de, para }) => !arquivosComDiferenca.has(de) && !arquivosComDiferenca.has(para),
  );

  return {
    arquivosNaDiferenca: entradas.length,
    renomeacoes: conferidas.toSorted(porCaminho),
    repartidas: agruparRepartidas(correspondencias).toSorted((a, b) => a.para.localeCompare(b.para)),
    barrels: barrels.toSorted(),
    ligacoes,
    diferencas,
  };
}
