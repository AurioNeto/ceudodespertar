# TSK-310: Aba Acessos real (A-01/A-02)

- **Estado:** ✅ Concluída (mesclada em #50 (`66d4eda`) e #55 (`1812df6`))
- **Peça do plano:** W05
- **Responsável sugerido:** vitro + frontiteto
- **Depende de:** [TSK-304](TSK-304-gestao-de-usuarios-e-grupos.md), [TSK-309](TSK-309-shell-com-menu-por-permissao.md)

## Contexto

Gestão de usuários pela interface.

## O que precisa ser feito

- Convidar, trocar grupos (com `If-Match`), desativar e reativar contra a API.
- Mensagens de erro do catálogo, incluindo `ULTIMO_ADMINISTRADOR` e `VERSAO_DESATUALIZADA`.
- A tela de suspensão avisa para **não escrever dado pessoal no motivo**. O motivo vai para a trilha, que só aceita inserção (decisão LGPD de 08/10). O domínio limita o motivo a 500 caracteres.

## Critérios de aceite

- Fluxo completo contra a API real

## Decisões do dono (09/10/2026)

- **Telas.** No mapa de telas, a A-01 é Usuários e a A-02 é Grupos e permissões, que na v1 é só leitura.
  - As duas ficam numa tela nova, **Acessos** (`/acessos`), na seção Sistema do menu, com `fonte: 'api'`.
  - A tela tem duas abas:
    - **Usuários**, que exige `sistema.usuario.gerenciar`.
    - **Grupos**, só leitura, visível para quem tiver `sistema.usuario.gerenciar` ou `sistema.grupo.gerenciar`.
  - O registro da tela é `acesso: ['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar']`.
  - As abas mock "Acesso ao sistema" e "Grupos e permissões" saem de Pessoas. Pessoas continua mock.
- **Layout da A-01.** Não há rota de detalhe.
  - Cada linha mostra avatar, nome, e-mail, último acesso, grupos em etiquetas e a situação num `StatusBadge`.
  - Acima da lista ficam os filtros de busca, situação e grupo.
  - As ações abrem uma `BottomSheet` no celular e um painel lateral no desktop:
    - **Grupos:** multi-seleção.
    - **Suspender e Reativar.**
    - **Convidar:** fica no cabeçalho e pede nome, e-mail e grupos. Sem grupo escolhido, a tela avisa que a pessoa entra como Leitura.
  - O botão Revogar sai, porque a API ainda não tem essa ação.
- **Layout da A-02.** Grupos com as permissões em linguagem humana, agrupadas por módulo, e o número de usuários de cada um. Editar grupo fica para depois.
- **409 `VERSAO_DESATUALIZADA`.** A tela recarrega o usuário via `GET /usuarios/:id`, atualiza a linha e mantém a ação aberta com um aviso. Não há reenvio automático.
- **Paginação.** Um botão "Carregar mais" usa o cursor `depois`, com 50 itens por página.
- **Aviso de LGPD.** O aviso fica no campo de motivo ao suspender e ao reativar, junto com um contador de 500 caracteres:
  > Não escreva dado pessoal nem de saúde aqui. O motivo fica gravado na trilha de auditoria e não pode ser apagado depois. Escreva só a razão administrativa — por exemplo, "deixou a tesouraria".
- **Convite sem e-mail real.** O botão "Reenviar convite" fica **escondido** até a TSK-305 ligar o envio. A confirmação do convite diz "Convite registrado" e não promete e-mail.
- **Erros.** Um mapa de código para texto em pt-BR, no web, sem tocar em contracts. Ele cobre `ULTIMO_ADMINISTRADOR`, `VERSAO_DESATUALIZADA`, `SITUACAO_DO_USUARIO_NAO_PERMITE`, `CONVITE_JA_USADO`, `GRUPO_INEXISTENTE`, `EMAIL_JA_CADASTRADO`, `CONVITE_JA_PENDENTE`, `MOTIVO_OBRIGATORIO` e `MOTIVO_LONGO_DEMAIS`.
- **Idempotency-Key.** A política do cliente HTTP não muda. Cada envio de formulário usa uma chave fixa, passada pela opção `chaveDeIdempotencia` do `criarComando`.
- **Dois PRs:**
  1. Tela, listagem, filtros, "Carregar mais", aba Grupos em leitura e registro de telas.
  2. Convidar, trocar grupos, suspender e reativar, junto com o tratamento do 409, as mensagens de erro, o aviso de LGPD e o fluxo completo contra a API real.
- **Fora do escopo:**
  - Ligar o usuário a uma Pessoa.
  - Mostrar autor e data de cada mudança de grupo.
  - Revogar acesso.
  - Editar grupos.

  Nenhum deles tem rota na API hoje.

## Como terminou

A task saiu em dois PRs.

1. **#50: tela, listagem e aba Grupos.**
   - A tela `/acessos` na seção Sistema, com `fonte: 'api'`.
   - Usuários: busca com atraso de 300 ms, filtros de situação e grupo, "Carregar mais" de 50 em 50 sem repetir usuário.
   - Grupos: só leitura, com as permissões por módulo.
   - Pessoas perdeu as abas mock de acesso e de grupos.
   - Componentes compartilhados: `ClienteHttpProvider` em `app/`, `Avatar` e `PermissoesPorModulo` em `components/`, `formatarDataHora` no fuso da casa. Os testes do web rodam em UTC.
2. **#55: comandos.**
   - Convidar, trocar grupos, suspender e reativar num painel novo do DS (`PainelDeAcao`), que abre como folha no celular e lateral no desktop.
   - O 409 relê o usuário e mantém o painel aberto com aviso, sem reenvio. Se a ação disponível mudar, o motivo é limpo.
   - Mapa de erros em pt-BR, aviso de LGPD com contador de 500 e "Reenviar convite" escondido.
   - Chave de idempotência por conteúdo do formulário. A política do cliente HTTP não mudou.
   - Resposta tardia de painel fechado é descartada, e as listas são atualizadas assim mesmo.

**Aceite atendido.** O fluxo completo rodou contra a API real local (Postgres próprio, Keycloak e Playwright):
- convite com e sem grupo, e e-mail repetido;
- troca de grupos, suspensão e reativação, com o motivo gravado como sensível na trilha;
- 409 por edição concorrente em outra aba;
- último administrador recusado;
- layout de celular.

## O que resta

- **Issue #54:** exportar o limite da busca no contrato e usá-lo na tela.
- **Reenviar convite:** a API já envia o e-mail e limita o reenvio (#65 e #74), mas o botão segue escondido. Ligar o botão e tratar o 429 está na issue #77.
- **Sem rota na API:** ligar o usuário a uma Pessoa, autor e data da mudança de grupo, revogar acesso e editar grupos.
- **Sem tratamento:** reabrir o painel durante um envio permite um segundo comando em voo. A versão e a Idempotency-Key protegem no servidor.
- **Acessibilidade:** só verificada por atributos e foco em jsdom, sem leitor de tela real.

_Atualizado em 12/10/2026._
