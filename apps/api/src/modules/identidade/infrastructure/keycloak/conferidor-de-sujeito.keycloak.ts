import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ConferidorDeSujeito, ProvedorDeIdentidadeIndisponivel } from '../../application/convite/conferidor-de-sujeito.js';
import { ClienteAdminDoKeycloak } from './cliente-admin-do-keycloak.js';
import { KeycloakIndisponivel, KeycloakRecusou, UsuarioNaoExisteNoKeycloak } from './erros-do-keycloak.js';

const UsuarioNoKeycloak = z.object({ email: z.string().optional() });

@Injectable()
export class ConferidorDeSujeitoKeycloak extends ConferidorDeSujeito {
  constructor(private readonly cliente: ClienteAdminDoKeycloak) {
    super();
  }

  async emailDo(sujeito: string): Promise<string | undefined> {
    try {
      return await this.cliente.executar({ renovarTokenEm401: true }, async (sessao) => {
        const resposta = await sessao.requisitar({ metodo: 'GET', caminho: `/users/${encodeURIComponent(sujeito)}` });
        const usuario = UsuarioNoKeycloak.safeParse(resposta.json());
        if (!usuario.success) throw new KeycloakIndisponivel('resposta fora do formato esperado');
        return usuario.data.email;
      });
    } catch (erro) {
      if (erro instanceof UsuarioNaoExisteNoKeycloak) return undefined;
      if (erro instanceof KeycloakIndisponivel || erro instanceof KeycloakRecusou) {
        throw new ProvedorDeIdentidadeIndisponivel(erro.diagnostico);
      }
      throw erro;
    }
  }
}
