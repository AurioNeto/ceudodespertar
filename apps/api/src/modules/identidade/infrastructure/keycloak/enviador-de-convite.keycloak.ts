import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { EnviadorDeConvite } from '../../application/convite/enviador-de-convite.js';
import type { ConviteParaEnviar } from '../../application/convite/enviador-de-convite.js';
import { ResolvedorDeSujeito } from '../../application/convite/resolvedor-de-sujeito.js';
import { ClienteAdminDoKeycloak } from './cliente-admin-do-keycloak.js';
import type { SessaoNoKeycloak } from './cliente-admin-do-keycloak.js';
import { CONFIGURACAO_DO_CONVITE_NO_KEYCLOAK } from './configuracao-do-keycloak.js';
import type { ConfiguracaoDoConviteNoKeycloak } from './configuracao-do-keycloak.js';
import { KeycloakIndisponivel, KeycloakRecusou } from './erros-do-keycloak.js';

const STATUS_USUARIO_JA_EXISTE = 409;
const MILISSEGUNDOS_POR_SEGUNDO = 1_000;
const ACOES_DO_CONVITE = ['UPDATE_PASSWORD'];
const ID_NO_LOCATION = /\/users\/([^/?#]+)$/;

const UsuariosEncontrados = z.array(z.object({ id: z.string().min(1), email: z.string().optional() }));

@Injectable()
export class EnviadorDeConviteKeycloak extends EnviadorDeConvite {
  private readonly logger = new Logger(EnviadorDeConviteKeycloak.name);

  constructor(
    private readonly cliente: ClienteAdminDoKeycloak,
    private readonly sujeitos: ResolvedorDeSujeito,
    private readonly relogio: Relogio,
    @Inject(CONFIGURACAO_DO_CONVITE_NO_KEYCLOAK) private readonly configuracao: ConfiguracaoDoConviteNoKeycloak,
  ) {
    super();
  }

  enviar(convite: ConviteParaEnviar): Promise<void> {
    return this.cliente.executar({ renovarTokenEm401: true }, async (sessao) => {
      const sujeito = await this.garantirUsuario(sessao, convite);
      if (sujeito === undefined) return;
      await this.dispararEmailDeAcoes(sessao, sujeito, convite);
    });
  }

  private async garantirUsuario(sessao: SessaoNoKeycloak, convite: ConviteParaEnviar): Promise<string | undefined> {
    const criacao = await sessao.requisitar({
      metodo: 'POST',
      caminho: '/users',
      corpo: corpoDoUsuario(convite),
      aceitar: [STATUS_USUARIO_JA_EXISTE],
    });
    if (criacao.status !== STATUS_USUARIO_JA_EXISTE) return idDoLocation(criacao.location);
    return this.adotarUsuarioExistente(sessao, convite);
  }

  private async adotarUsuarioExistente(
    sessao: SessaoNoKeycloak,
    convite: ConviteParaEnviar,
  ): Promise<string | undefined> {
    const busca = await sessao.requisitar({
      metodo: 'GET',
      caminho: '/users',
      consulta: { email: convite.email, exact: 'true' },
    });
    const encontrados = UsuariosEncontrados.safeParse(busca.json());
    const existente = encontrados.success
      ? encontrados.data.find(({ email }) => email?.toLowerCase() === convite.email.toLowerCase())
      : undefined;
    if (existente === undefined) throw new KeycloakRecusou(STATUS_USUARIO_JA_EXISTE);

    const dono = await this.sujeitos.resolver(existente.id);
    if (dono !== undefined && dono.usuarioId !== convite.usuarioId) {
      this.logger.warn(`convite: e-mail já vinculado a outro usuário; envio não realizado (usuário ${convite.usuarioId})`);
      return undefined;
    }
    return existente.id;
  }

  private async dispararEmailDeAcoes(
    sessao: SessaoNoKeycloak,
    sujeito: string,
    convite: ConviteParaEnviar,
  ): Promise<void> {
    await sessao.requisitar({
      metodo: 'PUT',
      caminho: `/users/${encodeURIComponent(sujeito)}/execute-actions-email`,
      consulta: {
        client_id: this.configuracao.clientIdDoConvite,
        redirect_uri: `${this.configuracao.urlBaseDoApp}/entrar?convite=${convite.token}`,
        lifespan: String(this.segundosAteExpirar(convite.expiraEm)),
      },
      corpo: ACOES_DO_CONVITE,
    });
  }

  private segundosAteExpirar(expiraEm: Date): number {
    return Math.ceil((expiraEm.getTime() - this.relogio.agora().getTime()) / MILISSEGUNDOS_POR_SEGUNDO);
  }
}

function corpoDoUsuario({ email, nome }: ConviteParaEnviar): Record<string, unknown> {
  const [primeiroNome = '', ...resto] = nome.trim().split(/\s+/);
  return { username: email, email, firstName: primeiroNome, lastName: resto.join(' '), enabled: true };
}

function idDoLocation(location: string | null): string {
  const id = location === null ? undefined : ID_NO_LOCATION.exec(location)?.[1];
  if (id === undefined) throw new KeycloakIndisponivel('criação sem Location');
  return decodeURIComponent(id);
}
