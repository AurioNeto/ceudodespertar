export type TomDeAviso = 'atencao' | 'pendente' | 'confirmado' | 'neutro';

export interface MensagemDeEntrada {
  readonly tom: TomDeAviso;
  readonly titulo: string;
  readonly corpo: string;
}
