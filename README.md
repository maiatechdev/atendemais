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
*   Node.js 24 (mínimo 20.6, por causa da flag `--env-file`).
*   Um banco MySQL/MariaDB acessível (local na sua máquina, ou o da VM em produção).

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

Para usar o banco de teste definido no `.env.test`:
```bash
npm run dev:local
```

#### 🚀 Modo Produção (teste local do build)
Para conferir na sua máquina o build que vai para a VM:
1.  Gere a versão otimizada:
    ```bash
    npm run build
    ```
2.  Inicie o servidor carregando o `.env` (que deve ter `NODE_ENV=production`):
    ```bash
    node --env-file=.env server.js
    ```
    > `npm start` não carrega o `.env`. Sem `NODE_ENV=production`, ele sobe em modo desenvolvimento.

Em produção, o sistema roda pelo PM2 na VM. Veja a seção de deploy abaixo.

---

## ☁️ Deploy em Produção (VM Ubuntu)

O Atende+ e o Portal SEMDESC rodam numa **VM Ubuntu 24.04** da infraestrutura do município.
O passo a passo completo está em **[DEPLOY_VM.md](DEPLOY_VM.md)**.

### Arquitetura

```
Internet ──443/80──► Nginx ──┬── domínio do portal   → Portal SEMDESC (arquivos estáticos)
                             └── domínio do Atende+  → 127.0.0.1:3001 (Node/PM2, HTTP + WebSocket)
                                                            │
                                                            └── MariaDB 127.0.0.1:3306 (só local)
```

| Componente | Papel |
|---|---|
| **Nginx** | Proxy reverso, HTTPS e arquivos estáticos do portal. Repassa o WebSocket do Socket.io. |
| **PM2** | Mantém o `server.js` rodando e o reinicia se a VM reiniciar (`ecosystem.config.cjs`). |
| **MariaDB** | Banco local. As tabelas são criadas pelas migrations do Prisma. |

### Estrutura de domínios

O Portal SEMDESC (repositório `portal-semdesc`) é o ponto de entrada único dos sistemas da
Secretaria. Cada sistema fica em um **subdomínio próprio** do portal, e o Atende+ é o primeiro.
Para adicionar um sistema novo, basta criar um bloco `server` no Nginx apontando para a porta
interna dele e colocar o link no portal.

### Resumo da atualização

Na VM, como usuário `deploy` (detalhes e rollback na seção 11 do guia):

```bash
cd /var/www/atendemais
git pull origin main
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
npx prisma migrate deploy
pm2 restart atendemais
```

### Comandos úteis do PM2

*   `pm2 list` (Ver se está rodando)
*   `pm2 logs atendemais` (Ver o que está acontecendo)
*   `pm2 restart atendemais` (Reiniciar, necessário após alterar o `.env`)
*   `pm2 stop atendemais` (Parar)

> O `server.js` não usa dotenv. Quem carrega o `.env` é o Node, pela flag `--env-file=.env`
> definida no `ecosystem.config.cjs`. Por isso o app só enxerga mudanças no `.env` depois de reiniciar.

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
