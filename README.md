# Atende+ Web App Prototype 🏥✅

Sistema moderno de gerenciamento de filas e atendimento, desenvolvido para simular um ambiente real de triagem e chamada de senhas (ex: prefeituras, clínicas, poupatempo).

O projeto utiliza uma arquitetura **Híbrida (Monorepo)**, unindo a performance do React (Vite) no frontend com a robustez do Node.js (Express + Socket.io) no backend.

---

## 🚀 Funcionalidades Principais

*   **Tempo Real (Real-time)**: Atualizações instantâneas via Socket.io. Se uma senha é chamada, aparece na hora em todas as telas.
*   **Voz Humanizada**: O Painel Público anuncia as senhas chamadas (ex: "Senha Preferencial 001, Guichê 2").
*   **Fila Inteligente**: Sistema de prioridades que intercala atendimentos normais e preferenciais automaticamente.
*   **Monitoramento**: Dashboard ao vivo com métricas de tempo de espera e tamanho da fila.
*   **Sessão Dinâmica**: Atendentes escolhem seu Guichê/Sala e Serviços no momento do login.
*   **Persistência**: Dados salvos em banco MySQL/MariaDB, não se perdem ao reiniciar.

---

## 🖥️ Módulos do Sistema

### 1. 📺 Painel Público (TV)
*   **Rota**: `/painel`
*   Exibe a senha atual em destaque e o histórico das últimas chamadas.
*   Toca som de campainha e anuncia a senha por voz.

### 2. 🎫 Gerador de Senhas (Totem)
*   **Rota**: `/gerador`
*   Interface touch para o cidadão retirar senha.
*   Opções: Normal e Prioritário.
*   Coleta dados opcionais: Nome, CPF, Telefone, Bairro.

### 3. 👩‍💼 Área do Atendente
*   **Rota**: `/atendente` (Requer Login)
*   Visualiza a fila em tempo real.
*   Chama a próxima senha (lógica automática de prioridade).
*   Inicia e Finaliza atendimentos.
*   Reporta "Não Apareceu" (devolve para fila após tentativas).

### 4. 🛠️ Painel Administrativo
*   **Rota**: `/admin` (Acesso restrito)
*   Gerencia usuários (criar/editar/excluir atendentes).
*   Gerencia serviços disponíveis.
*   Visualiza usuários online em tempo real.
*   Reseta a fila do dia.

---

## 🛠️ Instalação e Execução

### Pré-requisitos
*   Node.js instalado (v18 ou superior).
*   Um banco MySQL/MariaDB acessível (local, ou o da Hostinger — veja a seção de Deploy abaixo).

### 1. Instalação
Baixe o projeto e instale as dependências:
```bash
npm install
```

### 2. Configurar Banco de Dados
Copie `.env.example` para `.env` e preencha `DATABASE_URL` com a string de conexão do seu MySQL/MariaDB:
```bash
cp .env.example .env
```
Depois aplique as migrations:
```bash
npx prisma migrate deploy
```

### 3. Rodar o Projeto

#### 👨‍💻 Modo Desenvolvimento (Para programar)
Use este modo se estiver alterando o código. Ele tem "Hot Reload" (atualiza sozinho).
```bash
npm run dev
```
*   Acesse: `http://localhost:3001`

#### 🚀 Modo Produção (Para uso real/Deploy)
Use este modo para deixar rodando na recepção/triagem. É mais leve e rápido.
1.  Gere a versão otimizada (apenas uma vez ou após atualizações):
    ```bash
    npm run build
    ```
2.  Inicie o servidor:
    ```bash
    npm start
    ```

---

## 🤖 Rodando 24h com PM2

Para garantir que o sistema não feche acidentalmente, use o **PM2** (Gerenciador de Processos):

1.  **Instale o PM2 (Globalmente):**
    ```bash
    npm install -g pm2
    ```
    *(Se der erro de permissão no Windows, abra o PowerShell como Admin)*

2.  **Inicie o Sistema:**
    ```bash
    pm2 start ecosystem.config.cjs
    ```

3.  **Comandos Úteis:**
    *   `pm2 list` (Ver se está rodando)
    *   `pm2 logs atendemais` (Ver o que está acontecendo)
    *   `pm2 restart atendemais` (Reiniciar)
    *   `pm2 stop atendemais` (Parar)
    *   `pm2 save` + `pm2 startup` (Garante que reinicia sozinho se a VPS reiniciar)

---

## ☁️ Deploy na Hostinger (VPS + MariaDB)

O sistema é um app único: o `server.js` serve a API/Socket.io **e** o build do frontend (`dist/`). Banco de dados em MariaDB (compatível com MySQL), gerenciado pelo phpMyAdmin do hPanel.

### 1. Criar o banco de dados (hPanel)
1.  No hPanel, vá em **Bancos de Dados > Gerenciador de Banco de Dados MySQL**.
2.  Crie um banco (ex: `u123456_atendemais`) e um usuário com senha forte, vinculado ao banco.
3.  Anote: host (geralmente `localhost` se o banco estiver na mesma VPS), usuário, senha e nome do banco.
4.  Use o **phpMyAdmin** (link no próprio hPanel) só para inspecionar/editar dados quando precisar — as tabelas serão criadas pelo Prisma, não precisa criar nada manualmente.

### 2. Preparar a VPS
1.  Acesse via SSH e instale Node.js (v18+) e o PM2 (`npm install -g pm2`).
2.  Envie o código para a VPS (git clone/pull ou upload via SFTP).
3.  Instale as dependências:
    ```bash
    npm install
    ```

### 3. Configurar o `.env`
Copie `.env.example` para `.env` e preencha com os dados do passo 1:
```bash
cp .env.example .env
```
```env
DATABASE_URL="mysql://usuario_banco:senha_banco@localhost:3306/nome_do_banco"
PORT=3001
NODE_ENV=production
```

### 4. Criar as tabelas e gerar o build
```bash
npx prisma migrate deploy
npm run build
```

### 5. Subir com PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Apontar o domínio
Configure um **Nginx** (ou o proxy reverso do próprio hPanel, se disponível no plano) para redirecionar o domínio para `http://127.0.0.1:3001` — a porta definida em `PORT` no `.env`. Lembre de habilitar **WebSocket upgrade** no proxy (necessário para o Socket.io funcionar), e ative SSL gratuito via **Let's Encrypt**.

> Como frontend e backend são servidos pelo mesmo processo/domínio, **não defina `FRONTEND_URL`** no `.env` — o CORS do Socket.io já libera tudo por padrão (`*`), e o cliente usa origem relativa automaticamente.

---

## 🔐 Segurança e Acesso

### Credenciais Padrão (Admin)
O sistema foi resetado e conta com um único administrador inicial:
*   **Email**: `admin@atende.plus`
*   **Senha**: `123456`

> **⚠️ Importante:** Ao fazer login pela primeira vez, use o botão de **Cadeado (🔒)** no topo da tela para alterar sua senha imediatamente.

### Novas Funcionalidades de Segurança
*   **Criptografia**: Todas as senhas agora são armazenadas com **hash seguro (Bcrypt)**. Nenhuma senha fica em texto puro.
*   **Migração Automática**: Se houver usuários antigos (legado), o sistema converte a senha para criptografia automaticamente no primeiro login.
*   **Troca de Senha**: Atendentes, Gestores e Admins podem trocar suas próprias senhas diretamente pelo painel.
