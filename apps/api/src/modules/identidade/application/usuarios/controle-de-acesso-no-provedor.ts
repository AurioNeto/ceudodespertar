export abstract class ControleDeAcessoNoProvedor {
  abstract bloquear(sujeito: string): Promise<void>;
  abstract liberar(sujeito: string): Promise<void>;
}
