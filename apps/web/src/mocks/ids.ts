/**
 * Os IDs do contrato são branded types — nas fixtures eles vêm de string
 * literal, então esta é a única fronteira onde a marca é aplicada à mão.
 */
export const id = <T extends string>(valor: string): T => valor as T;
