# TSK-014: Confirmar com a coordenação as decisões 1–8 do plano

- **Estado:** ✅ Confirmada pelo dono (14/10/2026), sem ajuste; a coordenação pode rever qualquer item
- **Responsável sugerido:** usuário + coordenação

## Contexto

O plano seguiu com recomendações que ainda precisam de confirmação da coordenação.

## O que precisa ser feito

1. TESOURARIA com 38 permissões, e ACOLHIMENTO sem `plano_contas.ler`.
2. `desativar` = SUSPENSO, reversível; REVOGADO sem comando no B0.
3. Usuário nasce sem Pessoa no B0 (US1 a partir do B1).
4. MFA: TOTP opcional; obrigatório para quem gerencia usuários.
5. Sessão SSO ociosa de 30 min; senha com 10+ caracteres, minúscula e número.
6. Evento mínimo no B1.
7. Separar o marco técnico (B2) do operacional (pós-deploy).
8. Anonimização na etapa B5.

## Decisão do dono (14/10/2026)

Os oito itens ficam como estão. O item 4 (MFA) ainda não está ligado no realm e entra antes do deploy (TSK-012). Os itens 3 e 6 entram na B1: a Pessoa mínima na TSK-512 e o Evento mínimo na TSK-518.

## Critérios de aceite

- Cada item confirmado ou ajustado e registrado no Doc 6

## Referências

- Plano: "Decisões pendentes"

_Atualizado em 14/10/2026._
