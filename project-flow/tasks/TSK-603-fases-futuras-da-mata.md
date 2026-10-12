# TSK-603: Fases futuras da mata (o que o guia propõe e a épica não cobriu)

- **Estado:** 🗺️ Roadmap
- **Responsável sugerido:** vitro + frontiteto; parte depende do backend (preferências do perfil) e do centro (guardiões)
- **Depende de:** [TSK-601](TSK-601-epica-redesign-forca-da-mata.md); preferências do perfil na API (B4 ou peça própria); validação dos guardiões com o centro

## Contexto

O guia `docs/design/forca-da-mata/` propõe mais do que a épica entregou. O dono deixou de fora, para fases futuras, o que exige backend, decisão do centro ou estrutura nova no front. Nada disto tem data.

## O que fica

- **Preferências do perfil na API** (`clima`, `guardião`, `foto`): hoje o clima vive só no `localStorage` do aparelho.
- **Troca automática de clima** por densidade (campo → Amanhecer, escritório → Noite) com a escolha manual prevalecendo; hora refinando o degradê.
- **Guardiões:** fila de guardiões no topo do Painel (sem tirar nada do dashboard atual), guardião por tela (selo no cabeçalho) e por pessoa (escolha em Meu perfil; o beija-flor é sempre a Munay e não entra na escolha). Precisa da validação do sentido espiritual com o centro antes de começar.
- **Foto no avatar**, dentro da folha, emoldurada pela pele do guardião (precisa de upload no backend).
- **Cerimônia no registro rápido** (F-01): `cerimonia_id` opcional no lançamento, a mais próxima sugerida; alimenta o resultado por cerimônia.
- **Botão central "Registrar"** de 56px em folha na barra inferior do campo.
- **Animações de ambiente:** seiva no cipó, vaga-lumes e raios na Noite, com `prefers-reduced-motion`; nunca no campo.
- **Climas alternativos** (Fogueira na noite, Chuva, Roda de cachimbo, Miração sagrada): só referência, em `outras-horas-da-mata.html`; entram só com pedido do centro.

## Referências

- `docs/design/forca-da-mata/GUIA-FORCA-DA-MATA.md` §08, §10, §11, §15 (fase 5) e a nota de implementação
- Memória da proposta: decisões do dono de 10/10/2026

_Atualizado em 12/10/2026._
