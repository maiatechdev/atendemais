# Guia de Deploy - Atende+ Web App

Este guia explica como colocar o sistema online em uma hospedagem.

## 📋 Pré-requisitos

### O que você vai precisar:
1. **Servidor/Hospedagem** com suporte a Node.js (v18+)
2. **Domínio** (opcional, mas recomendado)
3. **Acesso SSH** ao servidor
4. **Git** instalado no servidor

### Opções de Hospedagem Recomendadas:

#### 🟢 Opção 1: VPS/Cloud (Recomendado para produção)
- **DigitalOcean** (Droplet básico ~$6/mês)
- **AWS EC2** (t2.micro - Free tier disponível)
- **Google Cloud** (e2-micro - Free tier disponível)
- **Linode**
- **Vultr**

#### 🟡 Opção 2: Hospedagem Compartilhada com Node.js
- **Hostinger** (planos VPS)
- **Umbler**
- **Kinghost** (planos com Node.js)

#### 🔵 Opção 3: Plataformas PaaS (Mais fácil, mas com limitações)
- **Railway.app** (Gratuito com limites)
- **Render.com** (Gratuito com limites)
- **Fly.io** (Gratuito com limites)

---

## 🚀 Passo a Passo - Deploy em VPS (Ubuntu/Debian)

### 1. Preparar o Servidor

Conecte via SSH e instale as dependências:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Git
sudo apt install -y git
```

### 2. Clonar o Projeto

```bash
# Criar diretório para aplicações
mkdir -p ~/apps
cd ~/apps

# Clonar seu repositório (substitua pela URL do seu repo)
git clone https://github.com/seu-usuario/atende-web-app.git
cd atende-web-app
```

### 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env` no servidor:

```bash
nano .env
```

Adicione as configurações de produção:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prisma/dev.db"

# Opcional: Configurações adicionais
# ADMIN_EMAIL=admin@atende.plus
# ADMIN_PASSWORD=SuaSenhaSegura123!
```

### 4. Instalar Dependências e Preparar Banco

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate deploy

# Fazer build do frontend
npm run build
```

### 5. Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start npm --name "atende-app" -- start

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar com o sistema
pm2 startup
# Copie e execute o comando que aparecer
```

### 6. Configurar Firewall

```bash
# Permitir porta da aplicação
sudo ufw allow 3001/tcp

# Permitir SSH (IMPORTANTE!)
sudo ufw allow 22/tcp

# Ativar firewall
sudo ufw enable
```

### 7. Configurar Nginx (Proxy Reverso)

Instalar Nginx:

```bash
sudo apt install -y nginx
```

Criar configuração do site:

```bash
sudo nano /etc/nginx/sites-available/atende
```

Adicione a configuração:

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;  # Substitua pelo seu domínio

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support (importante para Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Ativar o site:

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/atende /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 8. Configurar SSL/HTTPS (Certbot - Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL (substitua pelo seu domínio)
sudo certbot --nginx -d seu-dominio.com.br

# Renovação automática já está configurada
```

---

## 🔄 Atualizando o Sistema

Quando fizer alterações no código:

```bash
cd ~/apps/atende-web-app

# Baixar atualizações
git pull

# Instalar novas dependências (se houver)
npm install

# Executar migrações (se houver)
npx prisma migrate deploy

# Rebuild do frontend
npm run build

# Reiniciar aplicação
pm2 restart atende-app
```

---

## 📊 Monitoramento

### Comandos PM2 úteis:

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs atende-app

# Ver logs de erro
pm2 logs atende-app --err

# Monitorar recursos
pm2 monit

# Reiniciar
pm2 restart atende-app

# Parar
pm2 stop atende-app
```

---

## 🌐 Deploy Simplificado - Railway.app (Alternativa Rápida)

Se preferir uma opção mais simples sem gerenciar servidor:

1. **Criar conta** em [Railway.app](https://railway.app)
2. **Conectar repositório** GitHub
3. **Adicionar variáveis de ambiente**:
   - `NODE_ENV=production`
   - `PORT=3001`
4. **Deploy automático** ao fazer push

> [!WARNING]
> Planos gratuitos têm limitações de uso mensal. Para uso contínuo, considere VPS.

---

## 🔐 Segurança Adicional

### Recomendações importantes:

1. **Alterar senha do admin** imediatamente após deploy
2. **Configurar backup** do banco de dados:
   ```bash
   # Adicionar ao crontab (backup diário)
   0 2 * * * cp ~/apps/atende-web-app/prisma/dev.db ~/backups/db-$(date +\%Y\%m\%d).db
   ```
3. **Manter sistema atualizado**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
4. **Monitorar logs** regularmente

---

## 🆘 Troubleshooting

### Aplicação não inicia:
```bash
pm2 logs atende-app --err
```

### Porta já em uso:
```bash
sudo lsof -i :3001
# Matar processo se necessário
sudo kill -9 <PID>
```

### Nginx não conecta:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Banco de dados corrompido:
```bash
# Restaurar backup
cp ~/backups/db-YYYYMMDD.db ~/apps/atende-web-app/prisma/dev.db
pm2 restart atende-app
```

---

## 📞 Acesso Remoto

Após deploy, o sistema estará acessível em:

- **Com domínio**: `https://seu-dominio.com.br`
- **Sem domínio**: `http://IP-DO-SERVIDOR:3001`

### Módulos do sistema:
- Painel Público: `/painel`
- Gerador de Senhas: `/gerador`
- Área do Atendente: `/atendente`
- Admin: `/admin`

---

## 💡 Dicas Finais

1. **Use HTTPS** sempre em produção (Certbot é gratuito!)
2. **Configure backups automáticos** do banco de dados
3. **Monitore recursos** do servidor (RAM, CPU, disco)
4. **Documente** suas credenciais em local seguro
5. **Teste** tudo antes de colocar em produção real
