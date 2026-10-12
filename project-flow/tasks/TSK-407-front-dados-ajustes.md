# TSK-407: Front: ajustes da camada de dados e do lint

- **Estado:** ✅ Feito (11/10/2026)
- **Responsável sugerido:** vitro
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Apontamentos do pre-review do #28 e lacunas de ferramenta.

## O que precisa ser feito

- ✅ Comparar o token usado no envio com o atual antes de renovar (`ec381a8`).
- ✅ 502 e 504 no retry (`1fd21ac`).
- ✅ **`Idempotency-Key` em todo POST, sem opção de desligar**, conflita com o interceptor da API em rotas sem instituição no contexto, como a futura ativação de convite (`POST /eu/ativacao`, TSK-305). Permitir desligar por chamada, ou a API ignorar a chave nessas rotas. A API passou a ignorar a chave: a marca `@SemIdempotencia` entrou no #51 e é usada em `POST /eu/ativacao` (#76). A chamada do front à ativação está na issue #77.
- ✅ O `pnpm lint` da raiz **não cobre o `apps/web/src`**: incluir e corrigir os achados que já existem. O #127 zerou os erros herdados e o #129 pôs o web no lint da raiz.
- ✅ Bundle acima do aviso do Vite: dividir por rota. As páginas são carregadas sob demanda desde o #136.

## Critérios de aceite

- Lint cobre o web e está verde
- `POST /eu/ativacao` funciona com o cliente HTTP real. O lado da API está provado: a rota responde 200 com `Idempotency-Key` presente. A chamada real do front fica na issue #77.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/28
- https://github.com/AurioNeto/ceudodespertar/pull/28#discussion_r4187821823

_Atualizado em 12/10/2026._
