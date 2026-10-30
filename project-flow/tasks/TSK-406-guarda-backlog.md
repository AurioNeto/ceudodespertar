# TSK-406: Guarda de acesso: pendências menores

- **Estado:** ✅ Feito (#225)
- **Responsável sugerido:** escudo
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Itens que o crivo da guarda deixou para o backlog.

## O que precisa ser feito

- ✅ Log do 503 com a causa da falha de rede (`61e9864`, no #27).
- ✅ Com o provedor fora há mais de 30 s, um `kid` desconhecido dá 503, e não 401, e cada token lixo gerava um `log.error`. **Decisão do dono (14/10):** o 503 continua, sem mudança no contrato HTTP, porque cobre a chave rotacionada logo antes da queda (o cliente tenta de novo em vez de ser deslogado). Só o log foi limitado: um `error` `Provedor de identidade indisponível` por minuto, no máximo (`JANELA_DO_ALERTA_DE_INDISPONIBILIDADE_EM_MS`), e os demais da janela saem em `warn`.
- ✅ Teste "várias chaves compatíveis durante a queda continuam 401": com duas chaves de mesmo `kid` no JWKS velho, a recusa (`JWKSMultipleMatchingKeys`) segue sendo recusa de token, e não indisponibilidade, tanto na falha da busca quanto na pausa depois dela. O jose não testa as candidatas sozinho: um JWKS com `kid` repetido recusa o token mesmo com o provedor no ar. O Keycloak não publica `kid` repetido.
- ✅ `azp` fixado. **Decisão do dono (14/10):** por lista configurável. `OIDC_CLIENTES_AUTORIZADOS`, separada por vírgula; ausente vale só `cdd-web`. Em produção, só tokens emitidos para o `cdd-web` são aceitos; em dev (`.env.example`) e no aceite com Keycloak real, também os do `cdd-teste`. Token sem `azp` ou de outro cliente vira 401, mesmo com `aud=cdd-api`.
- ✅ Marcas herdadas e implementação substituída. A leitura da marca foi corrigida: a marca do método passa a ser guardada no protótipo, pelo nome do método, e só vale para o método declarado na própria classe. Com isso:
  - nenhuma marca é herdada. A rota herdada de uma classe base não tem marca efetiva, nem a do método da base nem a da classe que herda, e responde 500 (fail-closed). Assim, a marca de classe de uma subclasse não afrouxa em silêncio a permissão que a base pôs no método (achado do crivo);
  - um decorator que troque `descriptor.value` não apaga mais a marca.

  O T30 ganhou controllers plantados para os casos, e eles reprovam com a leitura antiga. O `VerificadorDeSemIdempotenciaDasRotas` passou a usar a mesma leitura. A janela do log usa `performance.now()`, que não volta com ajuste de relógio.
  - (aceito, preexistente) Um `this.metodo = this.metodo.bind(this)` no construtor do controller troca o handler que o Nest usa: a marca do método se perde e vale a da classe. O T30 não enxerga isso, porque lê o protótipo. Nenhum controller faz isso hoje.

## Critérios de aceite

- Itens decididos e cobertos

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/27

_Atualizado em 30/10/2026._
