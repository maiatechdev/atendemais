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
*   **Persistência**: Dados salvos em banco SQLite, não se perdem ao reiniciar.

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

### 1. Instalação
Baixe o projeto e instale as dependências:
```bash
npm install
```

### 2. Configurar Banco de Dados
Prepare o banco SQLite (cria o arquivo `prisma/dev.db`):
```bash
npx prisma migrate dev --name init
```

### 3. Rodar o Projeto

#### 👨‍💻 Modo Desenvolvimento (Para programar)
Use este modo se estiver alterando o código. Ele tem "Hot Reload" (atualiza sozinho).
```bash
npm run dev
```
*   Acesse: `http://localhost:3000`

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
    npx pm2 start npm --name "atende-app" -- start
    ```

3.  **Comandos Úteis:**
    *   `npx pm2 list` (Ver se está rodando)
    *   `npx pm2 logs` (Ver o que está acontecendo)
    *   `npx pm2 restart atende-app` (Reiniciar)
    *   `npx pm2 stop atende-app` (Parar)
    *   `npx pm2 save` (Salvar para iniciar com o Windows - pesquise 'pm2 startup windows')

---

## 🔐 Credenciais Padrão

O sistema cria um administrador padrão na primeira execução:
*   **Email**: `admin`
*   **Senha**: `admin`