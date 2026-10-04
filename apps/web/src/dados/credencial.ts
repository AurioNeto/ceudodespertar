export interface FonteDeCredencial {
  tokenAtual(): Promise<string | null>;
  renovar(): Promise<boolean>;
  aoSessaoEncerrada(): void;
}

export const fonteDeCredencialNula: FonteDeCredencial = {
  tokenAtual: () => Promise.resolve(null),
  renovar: () => Promise.resolve(false),
  aoSessaoEncerrada: () => undefined,
};
