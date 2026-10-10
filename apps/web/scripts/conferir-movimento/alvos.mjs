export const NOME_PADRAO = 'default';
export const NOME_DO_NAMESPACE = '*';

export const alvoDeDeclaracao = (arquivo, nome) => ({ tipo: 'declaracao', arquivo, nome });
export const alvoDeModulo = (arquivo) => ({ tipo: 'modulo', arquivo });
export const alvoExterno = (especificador, nome) => ({ tipo: 'externo', especificador, nome });

export const alvoDoModuloResolvido = (modulo) =>
  modulo.externo === undefined
    ? alvoDeModulo(modulo.arquivo)
    : alvoExterno(modulo.externo, NOME_DO_NAMESPACE);

export function descreverAlvo(alvo) {
  switch (alvo.tipo) {
    case 'declaracao':
      return `${alvo.arquivo}#${alvo.nome}`;
    case 'modulo':
      return alvo.arquivo;
    default:
      return alvo.nome === NOME_DO_NAMESPACE ? alvo.especificador : `${alvo.especificador}#${alvo.nome}`;
  }
}

export const chaveDoAlvo = (alvo) => `${alvo.tipo}:${descreverAlvo(alvo)}`;

export const ligacao = (categoria, nome, apenasTipo, alvo) => ({ categoria, nome, apenasTipo, alvo });

export const chaveDaLigacao = ({ categoria, apenasTipo, nome, alvo }) =>
  [categoria, apenasTipo ? 'tipo' : 'valor', nome ?? '', chaveDoAlvo(alvo)].join('|');
