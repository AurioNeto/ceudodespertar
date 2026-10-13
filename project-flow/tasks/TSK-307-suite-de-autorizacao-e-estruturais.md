# TSK-307: Suíte de autorização (Doc 3 §11) e testes estruturais T28/T30

- **Estado:** ✅ T28a e T28b do web entregues (API: #53, #66, #75 e #78; web: T28a no #199 e T28b com o estado da tela no PR que fecha a #77; minúsculas fora do conjunto, como na api, por decisão do dono em 13/10)
- **Peça do plano:** I12
- **Responsável sugerido:** testudo
- **Depende de:** [TSK-304](TSK-304-gestao-de-usuarios-e-grupos.md)

## Contexto

O aceite do B0 exige T23–T26 e T28–T30 verdes; os demais casos são escritos e marcados pela etapa que os destrava.

## O que precisa ser feito

- As 35 entradas do Doc 3 §11, com meta-teste de etapa (`ETAPA_ATUAL`).
- T28 pelo type checker: escrita só pelo repositório, na api e no web.
- T30 pelo DiscoveryService:
- toda rota tem exatamente uma marca;
- toda escrita exige permissão;
- `@ApenasUsuarioAtivo` só em `GET /eu`.
- ✅ Opcional: regra que proíbe `.fork(` fora de `shared/infrastructure/banco` (TSK-402). Entrou com o T28a (#66).

## Decisões do dono (09/10/2026)

1. **T28 tem duas partes:**
   - T28a: escrita só pela camada de dados;
   - T28b: nome de grupo sempre tipado.
2. **Mecanismo do T28a na api:** um detector em teste, que nega por padrão kysely e @mikro-orm fora da persistência. Há uma allowlist de leitura para `leitor-*` e `consultas-*`. A barreira de tipos fica como continuação na TSK-402/410.
3. **Onde a escrita é permitida:**
   - escrita, na camada de persistência;
   - `fork`, `transactional` e `begin`, só em `banco/`;
   - `set_config`, só em `banco/` e no despachante.
4. **O que é escrita no T30:** método HTTP mutante, ou modo `escrita` ou `leitura-que-grava`.
5. **Rotas sem permissão:** uma tabela com as três marcas que dispensam permissão, inclusive `publico` nas rotas de saúde.
6. **`ETAPA_ATUAL`:** sobe à mão, no PR de aceite de cada etapa.
7. **Marca da rota:** extrair `marcaEfetivaDaRota` para `marcas-de-acesso.ts`, usada pela guarda e pelo T30. São cerca de 10 linhas de produção.
8. **Onde roda o T28 do web:** na suíte da api, lendo `apps/web/src`.
9. **`POST /eu/ativacao`:** fica como exceção explícita na tabela e nos Docs 3 e 7.
10. **T28b no web:** também pega literal de grupo no estado da tela. O `useState('tesouraria')` do `PessoasPage` precisa ser corrigido ou ganhar exceção com ticket. Obsoleto: o estado saiu do `PessoasPage` no #50.

**Decisões de 10/10:**
- T28 conta como coberto pelo T28a no B0, com o T28b como lacuna declarada até a peça 4; o aceite do B0 só fecha sem lacunas.
- Testes pendentes citam a etapa ("bloqueada até a B5"), nunca ID do plano.
- O catálogo não tem o campo `coberturaExistente`.
- T28a: savepoint/release/rollback to em toda a persistência; begin/commit/rollback/prepare só em `banco/` ou com exceção por arquivo com motivo nomeado; `transaction`/`startTransaction` só em `banco/`; `getInstance`/`getHttpServer` são violação por si sós; tipos de express/fastify fora enquanto não forem dependência direta.

**Decisão do T28b do web (13/10):** o conjunto proibido é o mesmo da api (códigos e nomes de exibição); grafias em minúsculas (`'tesouraria'`, `'leitura'`) ficam como limite declarado, porque são palavras comuns no web.

**Decisões do T28b (10/10):** só na API por ora (web na issue #77); variável tipada como código de grupo dentro de `string[]` comum não é acusada; lista de grupos em constante, no mesmo arquivo ou importada, é acusada; formas indiretas (objeto de configuração, campo estático, cópia em outra constante, espalhamento) ficam como limite conhecido.

**Divisão em PRs, todos só de teste exceto a decisão 7:**
1. T30.
2. Catálogo do §11, meta-teste de etapa, T24 e títulos do T26.
3. T28a na api.
4. T28b.
5. T28a no web.

A ordem é 1, 3, 2, 4, 5. O desenho está no scratchpad da sessão (`tsk307-desenho.md`).

## Critérios de aceite

- Violação plantada é pega
- Subir `ETAPA_ATUAL` obriga a escrever os casos da etapa

_Atualizado em 13/10/2026._
