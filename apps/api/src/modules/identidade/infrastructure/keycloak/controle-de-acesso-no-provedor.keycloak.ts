import { Injectable, Logger } from '@nestjs/common';
import { ControleDeAcessoNoProvedor } from '../../application/usuarios/controle-de-acesso-no-provedor.js';
import { ClienteAdminDoKeycloak } from './cliente-admin-do-keycloak.js';
import type { SessaoNoKeycloak } from './cliente-admin-do-keycloak.js';
import { UsuarioNaoExisteNoKeycloak } from './erros-do-keycloak.js';

const SEM_RENOVAR_TOKEN_NO_CONSUMIDOR = { renovarTokenEm401: false };

@Injectable()
export class ControleDeAcessoNoProvedorKeycloak extends ControleDeAcessoNoProvedor {
  private readonly logger = new Logger(ControleDeAcessoNoProvedorKeycloak.name);

  constructor(private readonly cliente: ClienteAdminDoKeycloak) {
    super();
  }

  bloquear(sujeito: string): Promise<void> {
    return this.aplicar(async (sessao) => {
      await this.definirHabilitado(sessao, sujeito, false);
      await sessao.requisitar({ metodo: 'POST', caminho: `${caminhoDoUsuario(sujeito)}/logout` });
    });
  }

  liberar(sujeito: string): Promise<void> {
    return this.aplicar((sessao) => this.definirHabilitado(sessao, sujeito, true));
  }

  private async aplicar(operacao: (sessao: SessaoNoKeycloak) => Promise<void>): Promise<void> {
    try {
      await this.cliente.executar(SEM_RENOVAR_TOKEN_NO_CONSUMIDOR, operacao);
    } catch (erro) {
      if (!(erro instanceof UsuarioNaoExisteNoKeycloak)) throw erro;
      this.logger.warn('usuário inexistente no provedor; nada a aplicar');
    }
  }

  private async definirHabilitado(sessao: SessaoNoKeycloak, sujeito: string, enabled: boolean): Promise<void> {
    await sessao.requisitar({ metodo: 'PUT', caminho: caminhoDoUsuario(sujeito), corpo: { enabled } });
  }
}

function caminhoDoUsuario(sujeito: string): string {
  return `/users/${encodeURIComponent(sujeito)}`;
}
