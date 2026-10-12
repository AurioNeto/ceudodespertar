# TSK-406: Guarda de acesso: pendências menores

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** escudo
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Itens que o crivo da guarda deixou para o backlog.

## O que precisa ser feito

- ✅ Log do 503 com a causa da falha de rede (`61e9864`, no #27).
- Depois de 30 s com o provedor fora, um `kid` desconhecido dá 503 e não 401, e cada token lixo gera `log.error`. Avaliar limitar o log ou voltar a 401.
- Teste "várias chaves compatíveis durante a queda continuam 401".
- Decidir se o `azp` deve ser fixado.
- A marca de método é herdada pela subclasse e passa por cima da marca da subclasse, embora o PR diga que "não há herança". Também um decorator que substitua `descriptor.value` apaga a marca do método. Cobrir os dois no teste estrutural (TSK-307).

## Critérios de aceite

- Itens decididos e cobertos

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/27

_Atualizado em 07/10/2026._
