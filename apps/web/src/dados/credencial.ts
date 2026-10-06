export type ResultadoDaRenovacao = 'renovado' | 'sessao-encerrada' | 'indisponivel';

export interface FonteDeCredencial {
  tokenAtual(): Promise<string | null>;
  renovar(): Promise<ResultadoDaRenovacao>;
  aoSessaoEncerrada(): void;
}

export const fonteDeCredencialNula: FonteDeCredencial = {
  tokenAtual: () => Promise.resolve(null),
  renovar: () => Promise.resolve('sessao-encerrada'),
  aoSessaoEncerrada: () => undefined,
};
