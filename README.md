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

> Esta seção só se aplica se você for rodar o sistema numa **VPS própria** (fora da Hostinger).
> No plano atual da Hostinger (Business/hospedagem compartilhada), quem gerencia o processo
> Node.js é o próprio hPanel — veja a seção de Deploy abaixo, não é preciso PM2/Nginx.

Para garantir que o sistema não feche acidentalmente numa VPS própria, use o **PM2** (Gerenciador de Processos):

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

## ☁️ Deploy na Hostinger (Business — Hospedagem Compartilhada)

O plano contratado é **Hostinger Business** (hospedagem compartilhada), não VPS. Não há acesso
SSH nem Nginx configurável — todo o gerenciamento é feito pelo **hPanel** (ou pela API dele,
usada nesta conta via MCP). Quem instala dependências, builda o frontend e mantém o processo
Node.js rodando é o **gerenciador de apps Node.js do próprio hPanel**, não PM2.

### Estrutura de domínios

O sistema hoje é dividido em dois domínios/sites dentro da mesma conta Hostinger:

| Domínio | Conteúdo | Tipo de deploy |
|---|---|---|
| `semdesc.com` (raiz) | Portal de sistemas da SEMDESC (página estática, projeto separado) | Deploy estático |
| `atendemais.semdesc.com` (subdomínio) | Este projeto (Atende+) | App Node.js |

O objetivo é que `semdesc.com` vire o ponto de entrada único para vários sistemas da SEMDESC no
futuro; o Atende+ foi movido para o subdomínio para isso. Path-based routing
(`semdesc.com/atendemais`) não é viável neste plano por falta de acesso a proxy reverso
configurável — subdomínio é a estratégia usada.

### 1. Criar o banco de dados (hPanel)
1.  No hPanel, vá em **Bancos de Dados > Gerenciador de Banco de Dados MySQL**.
2.  Crie um banco (ex: `usuario_atendemais`) e um usuário com senha forte, vinculado ao banco.
3.  Host de conexão: **`127.0.0.1`**, não `localhost` — nesta hospedagem, `localhost` faz o MySQL
    tentar conectar via socket Unix, que teve problemas intermitentes de autenticação; `127.0.0.1`
    força conexão TCP e resolveu o problema definitivamente.
4.  Use o **phpMyAdmin** (link no próprio hPanel) só para inspecionar/editar dados quando
    precisar — as tabelas são criadas pelo Prisma, não precisa criar nada manualmente.

### 2. Configurar o `.env`
Copie `.env.example` para `.env` e preencha:
```env
DATABASE_URL="mysql://usuario_banco:senha_banco@127.0.0.1:3306/nome_do_banco?connection_limit=1"
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://atendemais.semdesc.com
```
> `connection_limit=1` reduz o pool de conexões do Prisma — necessário porque o plano Business
> tem um limite baixo de processos por conta (NPROC), e o Prisma Query Engine pode travar
> (`PANIC: timer has gone away`) se abrir conexões demais.

### 3. Criar o site/subdomínio e implantar
1.  No hPanel, crie o site (ou subdomínio, se for um sistema novo além do Atende+) em
    **Websites**.
2.  Em **Node.js**, aponte o app para esse domínio/subdomínio, com `entry_file: server.js` e
    `build_script: build` (o hPanel roda `npm install`, `npm run build` — que gera o `dist/` via
    Vite — e depois `npm start` automaticamente a cada deploy).
3.  Envie o código como um arquivo `.zip` (excluindo `node_modules`, `dist`, `build`, `.git`,
    `documentacao_pdf`, mas **incluindo o `.env`**) pela opção de deploy por arquivo do hPanel.
4.  Depois do primeiro deploy bem-sucedido, rode as migrations uma vez (via terminal do hPanel ou
    localmente apontando `DATABASE_URL` para o host público do banco):
    ```bash
    npx prisma migrate deploy
    ```
5.  Reinicie a aplicação pelo hPanel sempre que trocar variáveis do `.env` (o app não recarrega
    sozinho).

> Como frontend e backend são servidos pelo mesmo processo/domínio, o CORS do Socket.io já
> funciona por padrão — `FRONTEND_URL` só existe para deixar isso explícito agora que há mais de
> um domínio na mesma conta.

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
