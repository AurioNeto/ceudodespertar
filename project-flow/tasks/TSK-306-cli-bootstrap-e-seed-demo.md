# TSK-306: CLI de bootstrap do primeiro administrador e seed demo

- **Estado:** ✅ Concluída (PRs 1 a 4 mesclados em #81, #89, #90 e #91; PR 5 opcional, reenvio do convite inicial, não iniciado)
- **Peça do plano:** I11
- **Responsável sugerido:** escudo + limpio
- **Depende de:** [TSK-305](TSK-305-adaptador-keycloak.md)

## Contexto

Sem um administrador inicial, ninguém consegue convidar ninguém.

## O que precisa ser feito

- Subcomando `identidade:bootstrap` de uso único (a 2ª execução é recusada).
- Seed de demonstração recusado fora de `local`/`ci`.

## Decisões do dono (10/10)

Desenho rev. 2 aprovado "conforme recomendação":

1. **D1 — primeiro administrador:** por convite (padrão) ou por vínculo de `sub` existente (`--sujeito`). No vínculo, o e-mail do `sub` é conferido antes da transação.
2. **D2 — ambiente:** `CDD_AMBIENTE` (`local|ci|homologacao|producao`), opcional e lida só pelo CLI, mais Keycloak e banco em loopback literal (`localhost`, `127.0.0.1`, `::1`). O host `postgres` não conta como loopback e `CI=true` não prova CI. Ausente ou inválida, o seed é recusado.
3. **D3 — segunda execução:** tabela de marcador `identidade.bootstrap_executado`, sem `instituicao_id`; recusa também se existir qualquer instituição; sem backfill. O dono confirmou que nenhum ambiente fora da máquina dele tem instituição criada por SQL manual.
4. **D4 — conteúdo do seed:** identidade completa pelo domínio. Usuários fictícios `*@demo.cdd.invalid`, com `sub` `demo:<slug>` para os ATIVOS, mais um pendente e um suspenso. Sem CPF, telefone, endereço ou dado de saúde.
5. **D5 — vínculo do dev:** feito na primeira execução. Se o `sub` divergir, o seed aborta e manda rodar `pnpm infra:zerar`. Sem religamento.
6. **D6 — papel do banco:** o CLI roda como `cdd_app`.
7. **D7 — homologação:** o seed vale só em `local`/`ci` por ora. Seed de homologação fica para a B1+; o Doc 7 §22 deve ser atualizado.

8. **emailVerified no vínculo (10/10):** o bootstrap não exige que o e-mail do `sub` esteja verificado. O realm não permite auto-registro e e-mail/username só são editáveis por admin; o README do CLI registra esse motivo.
9. **Fronteira do CLI (10/10):** a regra de depcruise do CLI da identidade fica só por import direto; o caminho transitivo configuracao-do-orm → opcoes-do-migrador é aceito porque o papel cdd_app está provado por pg_stat_activity. Tornar a regra transitiva só se surgir outro entrypoint com risco parecido.
10. **Dev com convite pendente no seed (10/10):** código próprio DEV_COM_CONVITE_PENDENTE, mesmo desfecho (aborta, exit 3, infra:zerar).

**PRs:**
1. `CDD_AMBIENTE`, `ambientePermiteSeedDemo` e `ModoDoProcesso`;
2. migration do marcador e caso de uso `BootstrapDaIdentidade`;
3. CLI `identidade:bootstrap`;
4. seed demo;
5. opcional: `identidade:reenviar-convite-inicial`.

## Critérios de aceite

- A 2ª execução é recusada
- O seed demo é recusado em outro ambiente

_Atualizado em 10/10/2026._
