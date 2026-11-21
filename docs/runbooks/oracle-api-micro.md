# API na Oracle Micro

A Micro hospeda somente a API. Banco e anexos ficam no Supabase. Keycloak está hospedado
na Cloud-IAM e a conta de serviço já foi conectada. HTTPS público já está validado; atualização da Vercel e
validação completa do login pelo frontend continuam pendentes. A verificação de
tokens continua obrigatória. Ver `cloud-iam.md`.

## Instalação inicial

- Ubuntu 24.04 AMD64, `VM.Standard.E2.1.Micro`, região principal San Jose.
- Node 24.22.3, obtido do distribuidor oficial e conferido por SHA-256.
- Serviço systemd `cdd-api`, usuário sem login, heap de 256 MB e limite de memória de 512 MB.
- A API escuta em `127.0.0.1:3000`. Caddy publica HTTPS em
  `https://ceudodespertar-api.duckdns.org`; ver `oracle-api-https.md`.
- Preparar o pacote em uma máquina de desenvolvimento: a Micro não compila o projeto.

```bash
bash infra/oracle/empacotar-api.sh /caminho/absoluto/cdd-api.tar.gz
```

O pacote contém `dist`, contratos e dependências de produção. Os arquivos de ambiente
não entram no pacote. Enviar o pacote, `instalar-api.sh` e `cdd-api.service` para uma
pasta protegida no servidor. Enviar o ambiente separadamente, somente após autorizar
o envio das credenciais para essa máquina.

O arquivo de ambiente precisa incluir os valores validados de banco, arquivos e configuração
geral da API. Usar `BANCO_URL` de `cdd_app`, pool inicial de duas conexões, TLS verificado
com a CA do Supabase e tempo de conexão da prontidão de 10000 ms. A credencial do migrador
não pertence ao servidor da API. Definir `ENDERECO_DE_ESCUTA=127.0.0.1` e `BANCO_TLS=verificar`; o instalador recusa
o ambiente sem esses dois valores.

Na instalação inicial, os endereços OIDC e de administração apontavam para
`http://localhost:8080`, com realm `cdd` e segredo provisório aleatório. Não há Keycloak
nesse endereço: essa configuração serviu à preparação do processo sem liberar autenticação.
O ambiente permanece `homologacao`, sem carga de dados reais nem seed de demonstração.
Emissor, administração, segredo da conta de serviço, origem do frontend e `APP_URL_BASE`
foram atualizados para Cloud-IAM e Vercel conforme `cloud-iam.md`.

Depois de transferir os arquivos, executar no servidor:

```bash
sudo bash instalar-api.sh cdd-api.tar.gz api.env identificador-da-versao
```

O instalador coloca o ambiente em `/etc/cdd/api.env`, acessível somente por root,
os arquivos em `/opt/cdd/api/releases/<versao>` e o serviço em `/etc/systemd/system`.
Se a prontidão falhar, o instalador restaura o link `current`, o `api.env` e a unit
anteriores, reinicia o serviço e retorna erro (na primeira instalação, apenas para o
serviço). Inspecionar o serviço antes de considerar a instalação concluída; o
procedimento não promove tráfego público.
Na primeira instalação não existe versão anterior. Não usar esse instalador como fluxo
de atualização de uma API em uso sem preparar a reversão da versão e do ambiente.

```bash
sudo systemctl status cdd-api
sudo journalctl -u cdd-api -n 100 --no-pager
curl --fail http://127.0.0.1:3000/saude/pronta
```

Remover a cópia de transferência de `api.env` depois de validar o serviço. A configuração
definitiva permanece somente em `/etc/cdd/api.env`.

## Acesso sem domínio

```bash
ssh -N -L 33000:127.0.0.1:3000 -i /caminho/da/chave ubuntu@IP_PUBLICO
```

Abrir `http://localhost:33000/saude/viva` ou `/saude/pronta`. Não liberar a porta 3000
no firewall. Para publicar a API, configurar domínio, TLS e proxy reverso separadamente.

## Situação em 20/11/2026

Instância criada pelo responsável em `163.192.0.124`; SSH validado e Node 24.22.3 instalado.
Pacote compilado e verificado com 2344 testes unitários aprovados. Após autorização do
responsável, a configuração foi transferida e instalada como `root:root`, permissão `600`.
As cópias temporárias de transferência, local e remota, foram removidas.

O serviço está ativo, habilitado para iniciar com a máquina e sem reinícios durante a
verificação. `/saude/viva` e `/saude/pronta` responderam 200; `/api/v1/eu` sem token
respondeu 401. Acesso ao bucket privado validado a partir da Micro; a credencial do
migrador não está no ambiente do serviço.

Escuta confirmada somente em `127.0.0.1:3000`, com consumo inicial de aproximadamente
144 MiB no cgroup. Essa medição em repouso não representa teste de carga. Túnel SSH
local em `127.0.0.1:33000` aberto e validado; ele precisa ser reaberto se a conexão cair
ou o computador reiniciar. O túnel é opcional após a publicação HTTPS pelo Caddy
em `https://ceudodespertar-api.duckdns.org`; integração completa com a Vercel
continua pendente. Keycloak conectado à Cloud-IAM: consulta de usuários autorizada
(200), gestão de clientes negada (403), serviço reiniciado com prontidão 200.
Token administrativo e acesso anônimo continuam rejeitados pela API de negócio (401).
