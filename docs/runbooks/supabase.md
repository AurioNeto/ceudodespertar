# Banco e anexos no Supabase

O frontend permanece na Vercel. A API acessa PostgreSQL com `cdd_app` e o armazenamento
privado pela API S3. O login continua no Keycloak.

## Banco

Em um projeto vazio, executar `infra/postgres/papeis.sql` e depois
`infra/postgres/preparar-supabase.sql` como `postgres`, em uma transação.
Configurar senhas fortes e distintas para `cdd_owner` e `cdd_app` separadamente.
O `postgres` do Supabase tem BYPASSRLS e não deve executar as migrações da aplicação.

Usar o endereço de **Connect → Session pooler**, porta 5432, com o usuário
`cdd_owner.<project-ref>` nas migrações e `cdd_app.<project-ref>` na API.
O modo de transação do pooler não é o destino deste procedimento.

| Variável | Configuração remota |
|---|---|
| `BANCO_URL` | URL PostgreSQL com `cdd_app.<project-ref>`, senha própria e banco `postgres` |
| `BANCO_URL_MIGRACAO` | Mesma conexão, com `cdd_owner.<project-ref>` e sua senha |
| `BANCO_MIGRACAO_ESCOPO` | `esquemas` |
| `BANCO_TLS` | `verificar` |
| `BANCO_TLS_CA` | Certificado PEM baixado em Database → Settings → SSL Configuration |
| `BANCO_POOL_MAXIMO` | `3` inicialmente; a prontidão usa mais uma conexão |
| `BANCO_PRONTIDAO_CONEXAO_TIMEOUT_MS` | `10000`; a consulta da prontidão continua limitada a 1 s |

As URLs não aceitam query string. A validação TLS inclui cadeia de confiança e hostname.
O certificado pode ocupar várias linhas dentro de aspas no arquivo de ambiente do Node.

O modo padrão `banco` preserva a exigência local de propriedade do banco inteiro.
O modo `esquemas` exige login direto como `cdd_owner`, sem SUPERUSER, BYPASSRLS
ou SET ROLE, permissão de criar esquemas e objetos no `public`, e propriedade dos
esquemas CDD e do histórico já existentes. As tabelas de domínio mantêm suas políticas.
O histórico recebe RLS sem políticas para clientes. Seu dono consegue mantê-lo.
O aviso informativo [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
é esperado nessa tabela: nenhum cliente recebe política de acesso ao histórico.
Se essa proteção falhar depois das migrações, o comando falha e deve ser repetido;
as permissões padrão preparadas acima já impedem acesso público ao histórico.

```bash
pnpm --filter @cdd/api build
node --env-file=.env.local apps/api/dist/banco/cli.js situacao
node --env-file=.env.local apps/api/dist/banco/cli.js migrar
```

Guardar as credenciais em arquivo ignorado pelo Git (`.env` ou `.env.local`), com permissão `600`.
Cada worktree tem seus próprios arquivos de ambiente; usar o caminho do arquivo correto
sem sobrescrever a configuração ou as alterações locais de outra worktree.
Na hospedagem, usar o gerenciador de segredos do serviço. Não colocar essas variáveis
na Vercel ou em variáveis `VITE_*`. O arquivo contém somente esta etapa de configuração,
sem todas as variáveis necessárias para iniciar a API e o Keycloak.

## Armazenamento

Em Storage → S3, gerar chaves exclusivas do servidor. Definir `S3_CHAVE_DE_ACESSO`
e `S3_SEGREDO`, `S3_REGIAO` com a região do projeto, `S3_BUCKET=cdd-anexos`,
`S3_ESTILO_DE_CAMINHO=true` e
`S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3`.
Essas chaves permitem acesso a todos os buckets e ignoram RLS. Manter o bucket privado
e as chaves somente na API. Validar upload, download, URL assinada e exclusão antes de liberar uso.

## Implantação iniciada em 20/11/2026

- Projeto existente `Ceu do Despertar`, referência `zogfnipgdbmjsinugtjy`, região `us-west-2`.
- 22 migrações iniciais instaladas, seguidas da B1-009 para fixar `search_path` das oito funções.
- B1-009 prioriza `pg_catalog, pg_temp`, inclusive diante de tabelas temporárias homônimas.
- Reversão e reaplicação da B1-009 verificadas em transação revertida. A reversão restaura o caminho anterior e os avisos associados.
- Conexões da API e prontidão, isolamento entre duas instituições e ausência de contexto validados no banco remoto, sem persistir dados de ensaio.
- API instalada em homologação na Oracle Micro, com acesso por túnel SSH; Keycloak e carga de dados reais pendentes.
- Nenhum recurso pago contratado por este procedimento.
- Bucket `cdd-anexos` criado e confirmado como privado (`public=false`).
- Upload pelo adaptador `ArmazenamentoS3`, download autenticado e URL assinada validados.
- Leitura anônima recusada; arquivo temporário excluído e ausência confirmada.
- Chaves S3 lidas do `.env` não versionado da worktree principal; arquivo e mudanças locais preservados.

Referências: [conexões](https://supabase.com/docs/guides/database/connecting-to-postgres),
[TLS](https://supabase.com/docs/guides/platform/ssl-enforcement) e
[autenticação S3](https://supabase.com/docs/guides/storage/s3/authentication).
