# Deploy na VM (Ubuntu 24.04) — Portal SEMDESC + Atende+

Passo a passo para colocar o **Portal SEMDESC** (site estático) e o **Atende+** (Node.js + Socket.io + MariaDB)
na VM de produção fornecida pelo setor de hospedagem.

## Visão geral

```
Internet ──443/80──► Nginx ──┬── PORTAL_DOMINIO  → /var/www/portal-semdesc (arquivos estáticos)
                             └── ATENDE_DOMINIO   → 127.0.0.1:3001 (Node/PM2, HTTP + WebSocket)
                                                        │
                                                        └── MariaDB 127.0.0.1:3306 (só local)
```

| Item | Valor |
|---|---|
| Usuário do sistema | `deploy` |
| Atende+ | `/var/www/atendemais` (repo `maiatechdev/atendemais`, branch `main`) |
| Portal | `/var/www/portal-semdesc` (repo `maiatechdev/portal-semdesc`) |
| Porta interna do app | `3001` (nunca exposta) |
| Banco | MariaDB local, banco `atendemais` |

Ao longo do guia, troque:
- `PORTAL_DOMINIO` pelo domínio do portal (ex.: `semdesc.municipio.gov.br`)
- `ATENDE_DOMINIO` pelo domínio do Atende+ (ex.: `atendemais.semdesc.municipio.gov.br`)
- `SENHA_FORTE_DO_BANCO` por uma senha gerada só com letras e números (`openssl rand -hex 20`)

> **Antes de começar**, peça ao setor de hospedagem: o IP da VM, o acesso SSH, a criação dos registros DNS
> dos dois domínios apontando para a VM e a informação de quem fornece o certificado SSL
> (eles próprios ou Let's Encrypt).

---

## 1. Preparar o servidor

Conecte como o usuário que o setor entregou e atualize o sistema:

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone America/Sao_Paulo
sudo apt install -y git curl ufw nginx mariadb-server
```

Crie o usuário que vai rodar a aplicação:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/atendemais /var/www/portal-semdesc
sudo chown -R deploy:deploy /var/www/atendemais /var/www/portal-semdesc
```

### Firewall

Se o setor não controlar o firewall por fora, ative o da própria VM.
**Libere o SSH antes de ativar**, ou você perde o acesso.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'      # 80 e 443
sudo ufw enable
sudo ufw status
```

As portas 3001 (Node) e 3306 (banco) **não** devem ser liberadas.

---

## 2. Instalar o Node.js e o PM2

O projeto usa Node 24 em desenvolvimento. Instale a mesma versão:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
sudo npm install -g pm2
```

---

## 3. Configurar o banco (MariaDB)

```bash
sudo mysql_secure_installation
```

Responda: remover usuários anônimos = **Y**, proibir login remoto do root = **Y**,
remover banco de teste = **Y**, recarregar privilégios = **Y**. Nas perguntas sobre a senha do root,
pode manter a autenticação por socket (padrão do Ubuntu).

Crie o banco e o usuário da aplicação:

```bash
sudo mysql
```

```sql
CREATE DATABASE atendemais CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'atendemais'@'localhost' IDENTIFIED BY 'SENHA_FORTE_DO_BANCO';
CREATE USER 'atendemais'@'127.0.0.1' IDENTIFIED BY 'SENHA_FORTE_DO_BANCO';
GRANT ALL PRIVILEGES ON atendemais.* TO 'atendemais'@'localhost';
GRANT ALL PRIVILEGES ON atendemais.* TO 'atendemais'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

O MariaDB do Ubuntu já escuta apenas em `127.0.0.1`. Confira com `sudo ss -tlnp | grep 3306`.

---

## 4. Acesso da VM ao GitHub (deploy keys)

Os repositórios são privados, então a VM precisa de uma chave **só de leitura** para cada um.
O GitHub não permite usar a mesma deploy key em dois repositórios, por isso são duas chaves.

```bash
sudo -iu deploy
ssh-keygen -t ed25519 -f ~/.ssh/gh_atendemais -N "" -C "vm-semdesc atendemais"
ssh-keygen -t ed25519 -f ~/.ssh/gh_portal     -N "" -C "vm-semdesc portal"
nano ~/.ssh/config
```

Conteúdo do `~/.ssh/config`:

```
Host github-atendemais
  HostName github.com
  User git
  IdentityFile ~/.ssh/gh_atendemais
  IdentitiesOnly yes

Host github-portal
  HostName github.com
  User git
  IdentityFile ~/.ssh/gh_portal
  IdentitiesOnly yes
```

```bash
chmod 600 ~/.ssh/config
cat ~/.ssh/gh_atendemais.pub
cat ~/.ssh/gh_portal.pub
```

No GitHub, em cada repositório: **Settings → Deploy keys → Add deploy key**, cole a chave pública
correspondente e deixe **"Allow write access" desmarcado**.

Teste (deve responder "successfully authenticated"):

```bash
ssh -T github-atendemais
ssh -T github-portal
```

---

## 5. Publicar o Portal SEMDESC

Ainda como `deploy`:

```bash
git clone github-portal:maiatechdev/portal-semdesc.git /var/www/portal-semdesc
```

> O `index.html` do portal tem o link `https://atendemais.semdesc.com` fixo. Se o domínio do Atende+
> mudar na nova hospedagem, atualize esse link no repositório do portal antes do deploy.

---

## 6. Publicar o Atende+

```bash
git clone github-atendemais:maiatechdev/atendemais.git /var/www/atendemais
cd /var/www/atendemais
git checkout main
```

### 6.1 Criar o `.env`

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Conteúdo:

```env
DATABASE_URL="mysql://atendemais:SENHA_FORTE_DO_BANCO@127.0.0.1:3306/atendemais"
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://ATENDE_DOMINIO
# Só se a integração com o "Tá na Mão" for usada. Gere com: openssl rand -hex 32
# EXTERNAL_API_KEY=
```

> Se a senha do banco tiver caracteres especiais (`@`, `:`, `/`, `#`, `%`), eles quebram a URL.
> Por isso a sugestão de gerar a senha com `openssl rand -hex 20`.

### 6.2 Instalar, gerar o build e criar as tabelas

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
npx prisma migrate deploy
```

- `PUPPETEER_SKIP_DOWNLOAD=1` evita baixar o Chromium (~300 MB), que só é usado para gerar PDFs da documentação.
- `npm ci` instala também as dependências de desenvolvimento porque o Vite é necessário para o build.
- O `postinstall` já roda `prisma generate`, gerando o cliente certo para o Ubuntu.

### 6.3 (Opcional) Trazer os dados da hospedagem atual

Se o sistema já está em uso na Hostinger e os dados precisam vir junto, faça isto **antes** do 6.4:

1. No phpMyAdmin da Hostinger, exporte o banco em formato SQL (estrutura + dados).
2. Copie o arquivo para a VM: `scp backup.sql deploy@IP_DA_VM:/home/deploy/`
3. Como o dump já traz a estrutura, recrie o banco vazio e importe:

   ```bash
   sudo mysql -e "DROP DATABASE atendemais; CREATE DATABASE atendemais CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u atendemais -p -h 127.0.0.1 atendemais < /home/deploy/backup.sql
   npx prisma migrate status
   ```

   O `migrate status` deve dizer que o banco está atualizado. Se faltar alguma migration, rode
   `npx prisma migrate deploy`.

Combine um horário sem atendimento para a migração, para não perder senhas emitidas no meio do processo.

### 6.4 Subir com PM2

```bash
pm2 start ecosystem.config.cjs
pm2 logs atendemais --lines 30
```

O log deve mostrar `Ambiente: PRODUÇÃO` e `Servidor rodando em http://localhost:3001`.
Teste localmente: `curl -I http://127.0.0.1:3001` deve responder `200`.

> O `ecosystem.config.cjs` passa `--env-file=.env` para o Node. Sem isso, as variáveis `PORT`,
> `FRONTEND_URL` e `EXTERNAL_API_KEY` do `.env` seriam ignoradas, porque o `server.js` não usa dotenv.

Faça o PM2 voltar sozinho quando a VM reiniciar:

```bash
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

O último comando imprime uma linha começando com `sudo env PATH=...`. Saia do usuário `deploy`
(`exit`) e rode essa linha com seu usuário administrador.

Rotação de logs (evita encher o disco), de volta como `deploy`:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```

---

## 7. Configurar o Nginx

Com seu usuário administrador:

```bash
sudo nano /etc/nginx/sites-available/semdesc
```

```nginx
# Necessário para o WebSocket do Socket.io
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Portal SEMDESC (estático)
server {
    listen 80;
    server_name PORTAL_DOMINIO;

    root /var/www/portal-semdesc;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Não expor a pasta .git do repositório
    location ~ /\.git {
        deny all;
    }
}

# Atende+ (Node + Socket.io)
server {
    listen 80;
    server_name ATENDE_DOMINIO;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Painel e atendentes ficam conectados o dia todo
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/semdesc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS

**Se o setor fornecer o certificado**, peça os arquivos `.crt` (com a cadeia completa) e `.key`.
Em cada `server`, troque `listen 80;` por `listen 443 ssl;`, adicione `ssl_certificate` e
`ssl_certificate_key` apontando para os arquivos e crie um `server` na porta 80 que redirecione
para HTTPS (`return 301 https://$host$request_uri;`).

**Se for usar Let's Encrypt** (o DNS precisa já estar apontando para a VM):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d PORTAL_DOMINIO -d ATENDE_DOMINIO --redirect
sudo certbot renew --dry-run
```

O Certbot ajusta o Nginx, força o redirecionamento para HTTPS e renova o certificado sozinho.

---

## 9. Primeiro acesso e checagem

1. Abra `https://PORTAL_DOMINIO` e confira o link para o Atende+.
2. Abra `https://ATENDE_DOMINIO/admin`.
3. **Se o banco foi criado do zero**, o sistema cria o admin padrão
   `admin@atende.plus` / `123456`. **Troque a senha imediatamente** e, de preferência, crie um admin
   com seu e-mail e remova o padrão.
4. Teste em duas abas: emita uma senha em `/gerador` e confirme que ela aparece em `/painel` e na tela
   do atendente sem recarregar. Se não aparecer, o problema costuma ser o WebSocket no Nginx (passo 7).
5. No navegador (F12 → Network → WS), a conexão `socket.io` deve estar com status `101`.

---

## 10. Backup diário do banco

Como `deploy`, guarde a credencial num arquivo protegido:

```bash
nano ~/.my.cnf
```

```ini
[client]
user=atendemais
password=SENHA_FORTE_DO_BANCO
host=127.0.0.1

[mysqldump]
user=atendemais
password=SENHA_FORTE_DO_BANCO
host=127.0.0.1
```

```bash
chmod 600 ~/.my.cnf
mkdir -p ~/backups
crontab -e
```

Adicione a linha abaixo para fazer o dump todo dia às 22h, mantendo 14 dias:

```cron
0 22 * * * mysqldump --single-transaction atendemais | gzip > ~/backups/atendemais_$(date +\%F).sql.gz && find ~/backups -name '*.sql.gz' -mtime +14 -delete
```

Teste rodando o comando uma vez manualmente (sem as barras antes do `%`).

**Backup só na própria VM não protege contra perda da VM.** Peça ao setor snapshot periódico ou
copie a pasta `~/backups` para outro servidor.

Para restaurar:

```bash
gunzip < ~/backups/atendemais_AAAA-MM-DD.sql.gz | mysql atendemais
```

---

## 11. Como atualizar o sistema depois

Sempre teste na sua máquina antes (`npm run dev:local`). Depois, na VM, como `deploy`:

```bash
cd /var/www/atendemais
mysqldump --single-transaction atendemais | gzip > ~/backups/pre_deploy_$(date +%F_%H%M).sql.gz
git pull origin main
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
npx prisma migrate deploy
pm2 restart atendemais
pm2 logs atendemais --lines 30
```

Portal:

```bash
cd /var/www/portal-semdesc && git pull
```

Prefira atualizar fora do horário de atendimento. O `pm2 restart` derruba as conexões por alguns
segundos, e painel e atendentes reconectam sozinhos.

### Voltar uma versão (rollback)

```bash
cd /var/www/atendemais
git log --oneline -5
git checkout <commit_anterior>
PUPPETEER_SKIP_DOWNLOAD=1 npm ci && npm run build
pm2 restart atendemais
```

Se a versão nova tinha migration, restaure também o backup `pre_deploy_...` (seção 10).
Depois de corrigir, volte para a branch com `git checkout main` antes do próximo deploy.

---

## Comandos do dia a dia

| Para | Comando |
|---|---|
| Ver se está rodando | `pm2 list` |
| Ver logs | `pm2 logs atendemais` |
| Reiniciar o app | `pm2 restart atendemais` |
| Status do Nginx | `sudo systemctl status nginx` |
| Logs de erro do Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Status do banco | `sudo systemctl status mariadb` |
| Espaço em disco | `df -h` |

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `502 Bad Gateway` | App parado. Veja `pm2 logs atendemais`. |
| Página abre, mas senhas não atualizam em tempo real | Faltam os headers `Upgrade`/`Connection` no Nginx. |
| `Erro na inicialização do DB` no log | `DATABASE_URL` errada ou MariaDB parado. |
| API externa responde `503` | `EXTERNAL_API_KEY` não definida no `.env`. Defina e reinicie o PM2. |
| Mudou o `.env` e nada aconteceu | O app só lê o `.env` ao iniciar: `pm2 restart atendemais`. |
