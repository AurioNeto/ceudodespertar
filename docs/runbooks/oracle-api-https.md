# HTTPS da API na Oracle

O domínio `ceudodespertar-api.duckdns.org` aponta para `163.192.0.124`.
O Caddy termina TLS e encaminha as chamadas para `127.0.0.1:3000`.
A API continua privada no sistema operacional; apenas TCP 80 e 443 recebem tráfego web.

## Instalação e configuração

Instalar o pacote estável do repositório oficial, com chave de assinatura e fonte APT
conforme https://caddyserver.com/docs/install#debian-ubuntu-raspbian. Impedir a
partida do site padrão até instalar e validar a configuração do projeto.

- Copiar `infra/oracle/Caddyfile` para `/etc/caddy/Caddyfile`, root:root, modo `644`.
- Preservar a configuração anterior em `/etc/caddy/Caddyfile.antes-cdd`.
- Criar `/etc/caddy/cdd.env` com `CDD_API_DOMINIO=ceudodespertar-api.duckdns.org`.
  Esse arquivo contém somente o domínio público, sem segredos.
- Adicionar `/etc/systemd/system/caddy.service.d/cdd.conf`:

```ini
[Service]
EnvironmentFile=/etc/caddy/cdd.env
```

Validar antes de iniciar o serviço:

```bash
sudo -u caddy env CDD_API_DOMINIO=ceudodespertar-api.duckdns.org \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl daemon-reload
sudo systemctl enable --now caddy
```

O Caddyfile usa Let's Encrypt e renovação automática, sem plugins DNS nem token do
DuckDNS. HTTP redireciona para HTTPS. HTTP/3 fica desligado: basta TCP, sem liberar
UDP 443. O painel administrativo do Caddy permanece local, no padrão do pacote.
Não habilitar log de acesso com URLs completas: convites podem conter token na query.
Não apagar `/var/lib/caddy`: contém o estado persistente e as chaves dos certificados.

## Rede

Na lista de segurança vinculada à subnet pública da OCI, adicionar duas regras de
entrada stateful: origem `0.0.0.0/0`, TCP, portas de origem All e destinos 80 e 443.
Não alterar as regras de SSH nem publicar as portas 3000 ou 2019.

No firewall da máquina, preservar as regras Oracle existentes e adicionar somente
TCP 80/443 antes do REJECT. Manter backup antes da alteração:

```bash
sudo sh -c 'iptables-save > /etc/caddy/iptables.antes-cdd.v4'
sudo chmod 600 /etc/caddy/iptables.antes-cdd.v4
sudo iptables -C INPUT -p tcp -m multiport --dports 80,443 \
  -m comment --comment cdd-https -j ACCEPT || \
sudo iptables -I INPUT 1 -p tcp -m multiport --dports 80,443 \
  -m comment --comment cdd-https -j ACCEPT
sudo netfilter-persistent save
```

Não repetir a criação do backup antes de uma atualização: preservar a cópia anterior
à primeira implantação. Se o IP público mudar, atualizar o DuckDNS; não há atualizador
automático de DNS instalado por este procedimento.

## Verificação externa

```bash
curl --fail https://ceudodespertar-api.duckdns.org/saude/pronta
curl --head http://ceudodespertar-api.duckdns.org/saude/pronta
curl --include https://ceudodespertar-api.duckdns.org/api/v1/eu
```

Esperar prontidão 200, redirecionamento HTTP para HTTPS e acesso anônimo 401.
Conferir emissor, SAN e validade do certificado sem ignorar verificação TLS.
Conferir também CORS para a origem da Vercel e rejeição de origem não autorizada.
Essas verificações não substituem o login real pelo frontend.

Se houver timeout externo, conferir tanto a lista de segurança OCI quanto o
firewall local. Consultar `journalctl -u caddy` para erros de emissão. Evitar
reinícios repetidos durante falhas de validação para não provocar limites da CA.

## Reversão

Para retirar o acesso público mantendo a API, parar `caddy` e remover somente a
regra identificada por `cdd-https`, persistindo o firewall. Remover as duas regras
web na OCI quando não forem mais usadas. Não restaurar todo o firewall sobre
alterações posteriores sem revisão. Para voltar à configuração anterior do Caddy,
restaurar o backup, validar e recarregar o serviço.

## Situação em 20/11/2026

DNS IPv4 confirmado para a instância. Caddy 2.11.9 instalado pelo repositório
oficial; configuração validada. Firewall local atualizado e persistido somente
para TCP 80/443. Escuta da API preservada em loopback; administração do Caddy
confirmada em `127.0.0.1:2019`. O proxy respondeu localmente com redirect 308.

A primeira emissão encontrou bloqueio nas portas da OCI. O responsável liberou
TCP 80/443 na lista de segurança e o proxy foi retomado. Let's Encrypt emitiu
certificado para `ceudodespertar-api.duckdns.org`, com validade até 18/02/2027,
22:46:57 UTC; renovação automática gerenciada pelo Caddy.

Verificação externa com validação TLS habilitada: viva e prontidão 200, HTTP para
HTTPS 308, `/api/v1/eu` sem token 401. CORS autorizou a origem da Vercel e não
retornou autorização para `https://example.com`. Serviço Caddy ativo e habilitado;
API continua em loopback. Consumo em repouso: aproximadamente 13 MiB do Caddy e
137 MiB da API, sem representar teste de carga.

## Frontend na Vercel

Atualizar as variáveis do ambiente publicado e refazer o deploy:

```dotenv
VITE_API_URL=https://ceudodespertar-api.duckdns.org
VITE_OIDC_EMISSOR=https://lemur-2.cloud-iam.com/auth/realms/ceu-do-despertar
VITE_OIDC_CLIENTE=cdd-web
```

Nenhum segredo do Keycloak pertence ao frontend. A conclusão do HTTPS não comprova
login, vínculo de membro nem recuperação silenciosa entre sites. Validar esses
fluxos após o novo deploy, conforme `cloud-iam.md`.
