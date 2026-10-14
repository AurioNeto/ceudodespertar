# TSK-018: Perguntas do front deixadas pelas correções de comportamento

- **Estado:** ✅ Feito: financeiro no #216, eventos e inscrição no #218, litros no #220 (14/10/2026)
- **Responsável sugerido:** vitro (cada resposta vira um PR pequeno na tela)
- **Depende de:** nada; nenhuma pergunta bloqueia a refatoração do front

## Contexto

As correções de comportamento (#140 a #145) e o R$ em todo valor (#147 a #152) aplicaram as decisões da seção 15 do Doc 8. Restaram nove pontos que a seção 15 não cobre e que só o dono pode decidir. Estão registrados no Doc 8: oito como "Pergunta ao dono" na seção 14.3 e o do sinal negativo na 14.4. Hoje as telas seguem o comportamento descrito em cada item.

## Perguntas

| # | Pergunta | Hoje | Tela |
|:-:|---|---|---|
| 1 | Qual forma de valor negativo vale em todas as telas: `R$ -110,00` ou `− R$ 110,00`? | As duas convivem. `formatarBRL` dá `R$ -110,00` (saldo de Lançamentos, resultado do Fechamento); onde a tela põe o sinal à parte sai `− R$ 187,40` (tabela de Lançamentos, Verificação, histórico do Fechamento, gráfico do Painel) | várias |
| 2 | Uma parcela negativa dentro de um valor somado (`-50+60`) deve ser vetada? | Passa, porque o bloqueio olha só o total (registra 10) | Registrar lançamento |
| 3 | O bloqueio de período fechado vale também na aprovação individual? | Vale só nos dois botões em lote; o painel "Aprovar e consolidar" consolida item de julho | Verificação de lote |
| 4 | A data digitada deve aceitar dia e mês sem zero (`5/9/2026`)? | Só aceita dd/mm/aaaa com 2-2-4 dígitos | Agenda, Devoluções, Contratações |
| 5 | A idade no link público é medida no dia do evento ou no hoje da demonstração? | No hoje (02/09/2026): quem faz 18 até o evento (12/09) é recusado | Inscrição pública |
| 6 | Ao trocar de evento, responsável e hospedagem recomeçam? | Continuam (recomeçam tipo, modalidade, conversa, recado, "Copiado", nível, valor e diárias) | Inscrição |
| 7 | A autorização do responsável olha também a modalidade (Doc 2, AR3)? | Olha só o evento | Inscrição |
| 8 | O "Copiado" do link recomeça ao trocar de pessoa ou ao salvar? | Recomeça só ao trocar de evento | Inscrição |
| 9 | Litros com 3 casas ou mais (`0,255`) são recusados ou arredondados? | Arredondados para 2 casas na leitura | Ayahuasca |

## Decisões do dono (13/10/2026)

1. **Valor negativo:** `− R$ 110,00` em todas as telas, com a forma centralizada no `formatarBRL`. Feito no #216 (14/10).
2. **Parcela negativa num valor somado:** vetada; cada parcela precisa ser positiva. Feito no #216 (14/10).
3. **Período fechado:** o bloqueio vale também na aprovação individual ("Aprovar e consolidar"). Feito no #216 (14/10).
4. **Data digitada:** aceita dia e mês sem zero (`5/9/2026`) e normaliza para `05/09/2026`. Feito no #218 (14/10).
5. **Idade no link público:** medida no dia do evento. Feito no #218 (14/10).
6. **Trocar de evento:** responsável e hospedagem também recomeçam. Feito no #218 (14/10).
7. **Autorização do responsável:** olha a modalidade, conforme o Doc 2 (AR3). Feito no #218 (14/10).
8. **"Copiado" do link:** recomeça ao trocar de pessoa e ao salvar. Feito no #218 (14/10).
9. **Litros com 3 casas ou mais:** recusados com mensagem, sem arredondar. Feito no #220 (14/10).

## O que precisa ser feito

- Cada decisão vira um PR pequeno do front, na tela da coluna "Tela".
- Quando o PR de cada decisão entrar, a linha correspondente do Doc 8 deixa de ser "Pergunta ao dono" na seção 14.3 (ou na 14.4, a do sinal negativo) e passa à seção 15 como decisão.
- Decisões 1 a 3: feitas no #216 (14/10), já na seção 15 do Doc 8 e fora das seções 14.3 e 14.4.
- Decisões 4 a 8: feitas no #218 e decisão 9 no #220 (14/10), já na seção 15 do Doc 8 e fora da seção 14.3.

## Critérios de aceite

- As nove perguntas respondidas e registradas na seção 15 do Doc 8
- Cada mudança de comportamento num PR próprio, sem captura de telas: o gate do front é só de código (decisão do dono, 11/10)

## Referências

- `docs/CDD-08-frontend-estrutura.md`, seções 14.3, 14.4 e 15
- https://github.com/AurioNeto/ceudodespertar/pull/146 (registro das correções e das perguntas)
- https://github.com/AurioNeto/ceudodespertar/pull/153 (registro do R$ e do sinal negativo)

_Atualizado em 14/10/2026._
