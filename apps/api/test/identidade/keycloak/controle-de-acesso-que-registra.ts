import { Injectable } from '@nestjs/common';
import { ControleDeAcessoNoProvedor } from '../../../src/modules/identidade/application/usuarios/controle-de-acesso-no-provedor.js';

export interface ChamadaAoControle {
  readonly operacao: 'bloquear' | 'liberar';
  readonly sujeito: string;
}

@Injectable()
export class ControleDeAcessoQueRegistra extends ControleDeAcessoNoProvedor {
  readonly chamadas: ChamadaAoControle[] = [];
  falharCom: Error | undefined;

  bloquear(sujeito: string): Promise<void> {
    return this.registrar('bloquear', sujeito);
  }

  liberar(sujeito: string): Promise<void> {
    return this.registrar('liberar', sujeito);
  }

  private registrar(operacao: ChamadaAoControle['operacao'], sujeito: string): Promise<void> {
    this.chamadas.push({ operacao, sujeito });
    return this.falharCom === undefined ? Promise.resolve() : Promise.reject(this.falharCom);
  }
}
