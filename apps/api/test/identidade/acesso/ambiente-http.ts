import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { Controller, Get, Module } from '@nestjs/common';
import type { DynamicModule, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { GrupoId, Permissao, UsuarioId } from '@cdd/contracts';
import { IdentidadeModule } from '../../../src/modules/identidade/identidade.module.js';
import { EnviadorDeConvite } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { EntregaDeConvite } from '../../../src/modules/identidade/application/convite/entrega-de-convite.js';
import { Grupo } from '../../../src/modules/identidade/domain/grupo/grupo.js';
import { Usuario } from '../../../src/modules/identidade/domain/usuario/usuario.js';
import { ResolvedorDeContextoDeAcessoDaIdentidade } from '../../../src/modules/identidade/infrastructure/acesso/resolvedor-de-contexto-de-acesso.da-identidade.js';
import { GravadorDeTrilha } from '../../../src/modules/identidade/infrastructure/auditoria/gravador-de-trilha.js';
import { RepositorioDeGrupoMikroOrm } from '../../../src/modules/identidade/infrastructure/persistencia/repositorio-de-grupo.mikro-orm.js';
import { RepositorioDeUsuarioMikroOrm } from '../../../src/modules/identidade/infrastructure/persistencia/repositorio-de-usuario.mikro-orm.js';
import { AutenticacaoModule } from '../../../src/shared/infrastructure/autenticacao/autenticacao.module.js';
import { criarChavesRemotas } from '../../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { RequerPermissao } from '../../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { CHAVES_DE_VERIFICACAO } from '../../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { BancoModule } from '../../../src/shared/infrastructure/banco/banco.module.js';
import { UnidadeDeTrabalho } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { AMBIENTE } from '../../../src/shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { Despachante } from '../../../src/shared/infrastructure/eventos/despachante.js';
import { EventosModule } from '../../../src/shared/infrastructure/eventos/eventos.module.js';
import { RepositorioDoOutbox } from '../../../src/shared/infrastructure/eventos/repositorio-do-outbox.js';
import { BordaTransacionalInterceptor } from '../../../src/shared/infrastructure/http/borda-transacional.interceptor.js';
import { IdempotenciaInterceptor } from '../../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { FiltroDeErrosModule } from '../../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { ProvedorDeContextoDeInstituicao } from '../../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoDoAcesso } from '../../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.do-acesso.js';
import { middlewareDeCorrelacao } from '../../../src/shared/infrastructure/log/correlacao.js';
import { Relogio } from '../../../src/shared/infrastructure/relogio.js';
import { gerarUuidV7 } from '../../../src/shared/kernel/ids.js';
import { AMBIENTE_DO_KEYCLOAK_DE_TESTE } from '../../ambiente-de-teste.js';
import { AUDIENCIA_DE_TESTE, criarChavesDeTeste, emitirToken } from '../../autenticacao/chaves-de-teste.js';
import type { ChavesDeTeste } from '../../autenticacao/chaves-de-teste.js';
import { pedir } from '../../autenticacao/cliente-http.js';
import type { OpcoesDaRequisicao } from '../../autenticacao/cliente-http.js';
import { ServidorDeJwks } from '../../autenticacao/servidor-de-jwks.js';
import { comContexto } from '../../eventos/apoio.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../../unidade-de-trabalho/orm-de-teste.js';
import { AGORA, hashDeConvite } from '../apoio.js';
import { EnviadorDeConviteQueRegistra } from '../convite/enviador-de-convite.que-registra.js';

export const PERMISSAO_EXIGIDA_PELA_ROTA: Permissao = 'financeiro.lancamento.ler';
export const ROTA_PROTEGIDA_POR_PERMISSAO = '/api/v1/rota-protegida-por-permissao';
export const ROTA_EU = '/api/v1/eu';

const AUTOR = gerarUuidV7() as UsuarioId;
const LIMITE_DE_ESPERA_DO_PROVEDOR_EM_MS = 250;

@Controller('rota-protegida-por-permissao')
class RotaProtegidaPorPermissaoController {
  @RequerPermissao(PERMISSAO_EXIGIDA_PELA_ROTA)
  @Get()
  rota(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  imports: [BancoModule],
  controllers: [RotaProtegidaPorPermissaoController],
  providers: [
    { provide: ProvedorDeContextoDeInstituicao, useClass: ProvedorDeContextoDeInstituicaoDoAcesso },
    { provide: APP_INTERCEPTOR, useClass: BordaTransacionalInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
class RotasDeTesteModule {}

@Module({})
class AmbienteDeTesteModule {
  static com(emissor: string): DynamicModule {
    return {
      module: AmbienteDeTesteModule,
      global: true,
      providers: [
        {
          provide: AMBIENTE,
          useValue: { OIDC_EMISSOR: emissor, OIDC_AUDIENCIA: AUDIENCIA_DE_TESTE, ...AMBIENTE_DO_KEYCLOAK_DE_TESTE },
        },
      ],
      exports: [AMBIENTE],
    };
  }
}

export class RelogioManual extends Relogio {
  constructor(private instante: Date = new Date()) {
    super();
  }

  avancarEmMs(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }

  agora(): Date {
    return this.instante;
  }
}

export interface SubstituicoesDeProvider {
  readonly provider: unknown;
  readonly valor: unknown;
}

export interface AplicacaoDeAcesso {
  readonly app: INestApplication;
  readonly relogio: RelogioManual;
  readonly usuarios: RepositorioDeUsuarioMikroOrm;
  readonly grupos: RepositorioDeGrupoMikroOrm;
  entregarEventos(): Promise<void>;
  pedirComo(sujeito: string, rota?: string, requisicao?: OpcoesDaRequisicao): Promise<Response>;
  encerrar(): Promise<void>;
}

export async function subirAplicacaoDeAcesso(
  banco: BancoDeTeste,
  substituicoes: readonly SubstituicoesDeProvider[] = [],
): Promise<AplicacaoDeAcesso> {
  const chaves: ChavesDeTeste = await criarChavesDeTeste();
  const servidor = new ServidorDeJwks(chaves.conjunto);
  await servidor.iniciar();
  const relogio = new RelogioManual();
  process.env.BANCO_URL = urlDoAppPara(banco);
  process.env.BANCO_POOL_MAXIMO = '5';

  let construtor = Test.createTestingModule({
    imports: [
      AmbienteDeTesteModule.com(servidor.emissor),
      BancoModule,
      EventosModule,
      FiltroDeErrosModule,
      IdentidadeModule,
      AutenticacaoModule.comResolvedor(IdentidadeModule, ResolvedorDeContextoDeAcessoDaIdentidade),
      RotasDeTesteModule,
    ],
  })
    .overrideProvider(CHAVES_DE_VERIFICACAO)
    .useValue(criarChavesRemotas(servidor.emissor, { limiteDeEsperaEmMs: LIMITE_DE_ESPERA_DO_PROVEDOR_EM_MS }))
    .overrideProvider(Relogio)
    .useValue(relogio)
    .overrideProvider(EnviadorDeConvite)
    .useValue(new EnviadorDeConviteQueRegistra());
  for (const { provider, valor } of substituicoes) {
    construtor = construtor.overrideProvider(provider).useValue(valor);
  }

  const modulo = await construtor.compile();
  const app = modulo.createNestApplication({ logger: false });
  app.use(middlewareDeCorrelacao);
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
  const origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;

  const unidade = app.get(UnidadeDeTrabalho);
  const outbox = app.get(RepositorioDoOutbox);
  const trilha = app.get(GravadorDeTrilha);

  return {
    app,
    relogio,
    usuarios: new RepositorioDeUsuarioMikroOrm(unidade, outbox, trilha),
    grupos: new RepositorioDeGrupoMikroOrm(unidade, outbox, trilha),
    entregarEventos: () => app.get(Despachante).executarCiclo(),
    pedirComo: async (sujeito, rota = ROTA_EU, { metodo, corpo, cabecalhos = {} } = {}) => {
      const token = await emitirToken(chaves, { payload: { iss: servidor.emissor, sub: sujeito } });
      return pedir(origem, rota, { ...cabecalhos, authorization: `Bearer ${token}` }, { metodo, corpo });
    },
    encerrar: async () => {
      await app.get(EntregaDeConvite).aguardarEntregas();
      await app.close();
      await servidor.derrubar();
      delete process.env.BANCO_URL;
      delete process.env.BANCO_POOL_MAXIMO;
    },
  };
}

export function novoGrupoNomeado(nome: string, permissoes: readonly Permissao[]): Grupo {
  const resultado = Grupo.criar({
    id: gerarUuidV7() as GrupoId,
    codigoSistema: null,
    nome,
    descricao: 'Grupo de teste',
    protegido: false,
    permissoes,
  });
  if (resultado.tipo === 'erro') throw new Error(resultado.erro.codigo);
  return resultado.valor;
}

export function novoUsuarioAtivo(sujeito: string, nome: string, grupos: readonly GrupoId[]): Usuario {
  const hashDoConvite = hashDeConvite();
  const usuario = Usuario.convidar({
    id: gerarUuidV7() as UsuarioId,
    nome,
    email: `${randomUUID()}@casa.org`,
    grupos,
    hashDoConvite,
    conviteExpiraEm: new Date('2026-03-04T10:00:00.000Z'),
    convidadoPor: AUTOR,
    em: AGORA,
  });
  const ativacao = usuario.ativar(hashDoConvite, sujeito, AGORA);
  if (ativacao.tipo === 'erro') throw new Error(ativacao.erro.codigo);
  return usuario;
}

export async function semear(
  aplicacao: AplicacaoDeAcesso,
  instituicaoId: string,
  grupos: readonly Grupo[],
  usuario: Usuario,
): Promise<void> {
  for (const grupo of grupos) {
    // eslint-disable-next-line no-await-in-loop -- poucos grupos, na ordem
    await comContexto(instituicaoId, () => aplicacao.grupos.adicionar(grupo));
  }
  await comContexto(instituicaoId, () => aplicacao.usuarios.adicionar(usuario));
  await aplicacao.entregarEventos();
}
