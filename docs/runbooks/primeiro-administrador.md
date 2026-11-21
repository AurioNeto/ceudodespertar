# Primeiro administrador do ambiente hospedado

Cadastro inicial concluído em 20/11/2026 pelo CLI oficial, no modo vínculo.
A instituição é **Céu do Despertar**. Nenhum usuário de demonstração foi importado.

## Procedimento executado

1. Conferir que `shared.instituicao` e `identidade.bootstrap_executado` estão vazias.
2. Conferir que o e-mail confirmado pelo responsável não existe no realm.
3. Criar uma identidade habilitada no Keycloak, sem senha e sem atribuir papéis
   administrativos do realm. Não marcar o e-mail como verificado sem verificação.
4. Executar o CLI compilado com as configurações protegidas da API:

```bash
node --env-file=/etc/cdd/api.env dist/identidade-cli/cli.js bootstrap \
  --instituicao-nome 'Nome da instituição' \
  --admin-nome 'Nome confirmado do responsável' \
  --admin-email 'email-confirmado@example.org' \
  --sujeito 'identificador-da-identidade-no-keycloak'
```

Executar no diretório da release da API, usando o Node instalado na Oracle.
O CLI confere o e-mail do sujeito antes da transação, cria instituição e grupos,
semeia os cadastros iniciais da aplicação e grava o administrador ativo. Ele fixa
`CDD_PROCESSO=cli`; os consumidores de eventos não sobem nesse processo. A API
normal continua responsável pelo outbox. Não executar `seed-demo` neste ambiente.

O cadastro inicial é único por banco. Não repetir se existir instituição ou marcador.
Se a criação no Keycloak funcionar e o CLI falhar, preservar a identidade, conferir
se houve commit e recuperar pelo fluxo suportado; não apagar banco ou usuários reais.

## Senha e primeiro acesso

Como SMTP ainda não está configurado, não foi usado o modo convite por e-mail.
O responsável define a própria senha no console Keycloak:
**Users → usuário → Credentials → Set password**, com **Temporary** desligado.
Não registrar senha em chat, scripts, arquivos do repositório ou parâmetros do CLI.

Depois, entrar por `https://ceudodespertar-web.vercel.app/` com o e-mail confirmado.
O grupo Administrador da aplicação é separado de `realm-admin` do Keycloak.
Não conceder papéis administrativos do provedor para acessar a aplicação.

## Validação

O CLI terminou com sucesso. Consulta posterior, somente de leitura e com
`app.instituicao_id` local à transação, confirmou usuário `ATIVO`, identidade
vinculada, grupo `ADMINISTRADOR` ativo e exatamente um marcador de cadastro inicial.
Nenhuma senha foi criada pela automação e nenhum convite foi enviado.

O responsável confirmou a definição da senha. Login real pelo frontend ainda
precisa ser validado. As limitações de sessão entre Vercel e Cloud-IAM permanecem
documentadas em `cloud-iam.md`.
