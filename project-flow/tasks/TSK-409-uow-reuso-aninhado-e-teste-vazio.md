# TSK-409: UoW: reuso da transação aninhada e teste que não prova o `lastValueFrom`

- **Estado:** ✅ Em PR: o reuso da transação aninhada falha alto (`ErroDeTransacaoEncerrada` ou `ErroDeInstituicaoDivergenteNaTransacao`) quando a de fora já terminou ou quando a instituição do contexto não é a vinculada; o `vincularInstituicao` atualiza a instituição vinculada (caso do despachante). O teste da borda exige o valor 2 e a sequência exata, e pega o mutante `firstValueFrom`
- **Responsável sugerido:** limpio + radix

## Contexto

Dois achados confirmados do #19:
- o reuso da transação aninhada devolve `fn(ativa.contexto)` sem conferir se a transação ainda está aberta nem se a instituição do contexto atual é a mesma. Um callback solto (timer, `void promessa`) dentro de uma escrita de A, executado com o contexto de B, roda no `em` de A, já encerrada ou ainda aberta;
- o teste "não deixa nada emitir depois do commit" passa com o mutante `firstValueFrom`, porque a asserção aceita a ausência do evento.

## O que precisa ser feito

- Recusar o reuso quando a transação já terminou ou quando a instituição do contexto diverge, e abrir uma nova ou falhar alto.
- Exigir a sequência exata (`toStrictEqual(['begin:leitura','emitiu-segundo-valor','commit'])`) ou o valor resolvido 2.

## Critérios de aceite

- Teste com callback solto e instituição diferente
- O mutante `firstValueFrom` é pego

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187817983
- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187817804

_Atualizado em 13/10/2026._
