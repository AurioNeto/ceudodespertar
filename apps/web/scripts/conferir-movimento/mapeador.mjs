import { alvoDeDeclaracao, alvoDeModulo } from './alvos.mjs';

const SEPARADOR_DA_CHAVE = '\0';

const chaveDeSimbolo = (arquivo, simbolo) => `${arquivo}${SEPARADOR_DA_CHAVE}${simbolo}`;

export function criarMapeador(renomeacoes, correspondencias) {
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
