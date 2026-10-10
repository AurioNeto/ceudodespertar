# Runbook — Evento esgotado no outbox

Política de origem: Doc 7 §9 (despacho e ordem por agregado) e §13, linha "Evento esgotado". Este
runbook detalha o passo a passo com o que existe no código.

## Como o despacho funciona

- O despachante (`apps/api/src/shared/infrastructure/eventos/despachante.ts`) roda a cada 1 s
  (`INTERVALO_DE_POLLING_EM_MS`, :23) e logo após cada commit que gravou evento. Ele só sobe com
  `CDD_PROCESSO` ausente ou `api`. Com `cli`, que `apps/api/src/identidade-cli/cli.ts:1` fixa para
  `db:identidade:bootstrap` e `db:identidade:seed-demo`, não despacha.
- Cada falha soma 1 em `tentativas`, grava `ultimo_erro` e agenda `proxima_tentativa_em` com
  backoff de 1 s, 2 s, 4 s… até 5 min (`backoff.ts`). Ao chegar a `TETO_DE_TENTATIVAS = 10`
  (`teto-de-tentativas.ts:1`), o evento sai da fila: está esgotado. Com esse backoff, a 10ª
  tentativa acontece cerca de 8,5 min depois da primeira falha.
- Um consumidor estoura o tempo em `TIMEOUT_DO_CONSUMIDOR_EM_MS` (padrão 30 000 ms), e isso também
  conta como falha.
- **Seguidores travados:** o despachante só entrega um evento se não houver evento anterior do
  mesmo agregado (`agregado_tipo`, `agregado_id`) ainda sem `publicado_em` (`despachante.ts:36-43`).
  Um esgotado trava todos os eventos seguintes do mesmo agregado. Esses seguidores ficam com
  `tentativas` intocado e **não entram na contagem da vigia**.

Colunas de `shared.outbox` (`b0-001-shared/shared.sql:26-39`): `id`, `evento_id`,
`instituicao_id`, `tipo`, `agregado_tipo`, `agregado_id`, `payload`, `ocorrido_em`,
`publicado_em`, `tentativas`, `ultimo_erro`, `proxima_tentativa_em`. A tabela não tem RLS, e o
papel `cdd_app` (`BANCO_URL`) tem `UPDATE` nela (`shared.sql:174`).

Consumidores que existem (`@ReageA`):

| Tipo de evento | Agregado | Consumidor | Pode falhar por |
|---|---|---|---|
| `USUARIO_SUSPENSO` | `Usuario` | `SincronizadorDoAcessoNoProvedor.aoSuspenderUsuario` | Keycloak inacessível ou com erro ao bloquear o usuário |
| `USUARIO_REATIVADO` | `Usuario` | `SincronizadorDoAcessoNoProvedor.aoReativarUsuario` | Keycloak inacessível ou com erro ao liberar o usuário |
| `USUARIO_SUSPENSO`, `USUARIO_REATIVADO`, `USUARIO_ATIVADO` | `Usuario` | `InvalidadorDoCacheDeAcesso.ao…` | Só invalida cache em memória |
| `GRUPO_ALTERADO` | `Usuario` | `InvalidadorDoCacheDeAcesso.aoAlterarGruposDoUsuario` | Só invalida cache em memória |
| `GRUPO_EDITADO` | `Grupo` | `InvalidadorDoCacheDeAcesso.aoEditarGrupo` | Só invalida cache em memória |

Tipos sem consumidor são marcados como publicados assim que ficam elegíveis e nunca esgotam, mas
também ficam travados atrás de um esgotado do mesmo agregado. A auditoria não passa pelo outbox:
não existe consumidor `@ReageA` de auditoria.

## Sintoma

No log da API:

- `error` `outbox: eventos esgotados`, com `quantidade` e `maisAntigoEm`. A vigia
  (`vigia-de-eventos-esgotados.ts`) conta a cada 60 s e só registra quando a contagem muda.
- `error` `evento esgotou o teto de tentativas: evento=… tipo=… tentativas=…` (`despachante.ts:357`).
- Antes disso, um `warn` por falha: `consumidor falhou: evento=… tipo=… consumidor=… tentativas=… motivo=…`
  (`despachante.ts:257-258`). Exceção: quando o consumidor estoura o tempo limite, a transação do
  evento é abortada antes desse `warn`, e `ultimo_erro` guarda só `ErroDeTimeoutDoConsumidor`. Nesse
  caso nenhum log diz qual consumidor travou; descubra pela tabela de consumidores já processados
  (passo 3 do diagnóstico).

No sistema: o efeito do consumidor não aconteceu. Por exemplo, um usuário suspenso que continua
liberado no Keycloak.

## Diagnóstico

Conecte-se ao banco com `BANCO_URL` (papel `cdd_app`).

1. Liste os esgotados:
   ```sql
   select id, evento_id, tipo, agregado_tipo, agregado_id, tentativas,
          ultimo_erro, proxima_tentativa_em, ocorrido_em
     from shared.outbox
    where publicado_em is null and tentativas >= 10
    order by id;
   ```
2. Leia `ultimo_erro`. O formato é `<Classe>[: <código>][ constraint=<nome>] - o consumidor falhou ao processar o evento`
   (`formatador-de-erro.ts`), e ele guarda só o primeiro erro do ciclo. O consumidor que falhou e o
   motivo estão no `warn` `consumidor falhou` do log.
3. Veja quais consumidores já processaram o evento. Esses não rodam de novo:
   ```sql
   select consumidor, processado_em
     from shared.evento_processado
    where evento_id = '<evento_id>';
   ```
4. Liste os seguidores travados atrás dele:
   ```sql
   select distinct s.id, s.evento_id, s.tipo, s.ocorrido_em
     from shared.outbox s
     join shared.outbox e
       on e.agregado_tipo = s.agregado_tipo
      and e.agregado_id = s.agregado_id
      and e.id < s.id
    where s.publicado_em is null
      and e.publicado_em is null
      and e.tentativas >= 10
    order by s.id;
   ```

## Ação

1. Corrija a causa: restabeleça o acesso ao Keycloak ou corrija e implante o consumidor.
2. Devolva o evento à fila. Zere também `proxima_tentativa_em`: depois da 10ª falha ele fica até
   5 min no futuro, e o despachante não pega a linha antes disso.
   ```sql
   update shared.outbox
      set tentativas = 0, proxima_tentativa_em = null
    where evento_id = '<evento_id>' and publicado_em is null;
   ```
3. Não mexa nos seguidores: eles saem sozinhos assim que o evento anterior for publicado.
4. Descartar o evento sem entregá-lo (`set publicado_em = now()`) destrava os seguidores, mas o
   consumidor pendente nunca roda. Faça isso só com decisão explícita registrada, citando o
   `evento_id` (Doc 7 §13).

Precisa haver um processo da API em modo `api` no ar para o evento sair.

## Verificação

1. O evento foi publicado:
   ```sql
   select publicado_em, tentativas, ultimo_erro
     from shared.outbox
    where evento_id = '<evento_id>';
   ```
   Com `publicado_em` preenchido, o despacho terminou. Se `tentativas` voltou a subir, a causa não
   foi corrigida, e o evento esgota de novo em cerca de 8,5 min.
2. A consulta do passo 3 do diagnóstico lista todos os consumidores do tipo (tabela acima).
3. A consulta do passo 4 do diagnóstico volta vazia.
4. A consulta do passo 1 do diagnóstico volta vazia. A vigia só registra `info` `outbox: nenhum evento esgotado` se o mesmo processo já tinha visto contagem diferente de zero; depois de um reinício (por exemplo, para implantar a correção), essa linha pode nunca aparecer.
5. Confira o efeito no sistema. Para `USUARIO_SUSPENSO`/`USUARIO_REATIVADO`, veja se o usuário está
   bloqueado ou liberado no Keycloak conforme a situação dele no banco.
