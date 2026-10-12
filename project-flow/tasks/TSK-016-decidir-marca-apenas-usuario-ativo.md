# TSK-016: Registrar a exceção ao T24 (`@ApenasUsuarioAtivo` para `GET /eu`)

- **Estado:** ✅ Feito (exceção no Doc 3 §14.5, #96, 10/10/2026; regra no teste estrutural T30, #53, 09/10/2026)
- **Responsável sugerido:** glossia
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

O Doc 3 T24 diz "usuário sem grupo, qualquer endpoint → 403". A marca `@ApenasUsuarioAtivo` (PR #27) é a exceção deliberada para o `GET /eu`, por onde o front descobre que o usuário não tem grupo.

## O que precisa ser feito

- Registrar a exceção no Doc 3 (nota) e no Doc 7. Entra na documentação de encerramento (TSK-312).
- Garantir no teste estrutural (TSK-307) que a marca só aparece em `GET /eu`.

## Critérios de aceite

- Exceção documentada
- Teste estrutural falha se a marca aparecer em outra rota

## Como terminou

- **Doc 3 §14.5**, "Exceção ao T24: `GET /eu` sem grupo responde 200", entrou na documentação de encerramento do B0 (#96).
- **Teste estrutural:** a regra `usuario-ativo-fora-do-eu` (`apps/api/test/estrutural/rotas/verificar-rotas.ts`) só aceita a marca em `GET /eu`, e uma rota plantada com a marca faz o teste falhar (#53).
- O Doc 7 §7.1 diz que `GET /eu` é a única rota sem permissão específica, mas não usa o termo "exceção ao T24". Isso não bloqueia nada.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/27

_Atualizado em 12/10/2026._
