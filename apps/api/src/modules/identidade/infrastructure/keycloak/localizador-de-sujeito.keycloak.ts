import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ProvedorDeIdentidadeIndisponivel } from '../../application/convite/conferidor-de-sujeito.js';
import { LocalizadorDeSujeito } from '../../application/seed-demo/localizador-de-sujeito.js';
import { ClienteAdminDoKeycloak } from './cliente-admin-do-keycloak.js';
import { KeycloakIndisponivel, KeycloakRecusou, UsuarioNaoExisteNoKeycloak } from './erros-do-keycloak.js';

const UsuariosNoKeycloak = z.array(z.object({ id: z.string().min(1), username: z.string() }));

@Injectable()
export class LocalizadorDeSujeitoKeycloak extends LocalizadorDeSujeito {
  constructor(private readonly cliente: ClienteAdminDoKeycloak) {
    super();
  }

  async subDoUsuario(username: string): Promise<string | undefined> {
    try {
      return await this.cliente.executar({ renovarTokenEm401: true }, async (sessao) => {
        const resposta = await sessao.requisitar({
          metodo: 'GET',
          caminho: '/users',
          consulta: { username, exact: 'true' },
        });
        const usuarios = UsuariosNoKeycloak.safeParse(resposta.json());
        if (!usuarios.success) throw new KeycloakIndisponivel('resposta fora do formato esperado');
        return usuarios.data.find((usuario) => usuario.username.toLowerCase() === username.toLowerCase())?.id;
      });
    } catch (erro) {
      if (erro instanceof KeycloakIndisponivel || erro instanceof KeycloakRecusou) {
        throw new ProvedorDeIdentidadeIndisponivel(erro.diagnostico);
      }
      if (erro instanceof UsuarioNaoExisteNoKeycloak) throw new ProvedorDeIdentidadeIndisponivel('listagem de usuários inexistente');
      throw erro;
    }
  }
}
