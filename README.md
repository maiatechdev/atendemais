# Atende+ Web App Prototype 🏥✅

Sistema moderno de gerenciamento de filas e atendimento, desenvolvido para simular um ambiente real de triagem e chamada de senhas (ex: prefeituras, clínicas, poupatempo).

## 🚀 Tecnologias Utilizadas

O projeto utiliza uma arquitetura **Híbrida (Monorepo)**, onde o Frontend (React) e o Backend (Node.js) convivem e rodam juntos.

### Frontend (Interface)
-   **React + Vite**: Para uma interface super rápida e responsiva.
-   **Tailwind CSS**: Para estilização moderna e bonita.
-   **Lucide React**: Ícones visuais (impressora, check, usuários).
-   **Socket.io Client**: Para receber atualizações da fila em tempo real (sem precisar dar F5).

### Backend (Servidor)
-   **Node.js + Express**: Servidor web que entrega o site e a API.
-   **Socket.io**: Garante que se uma senha for chamada no "Atendente", ela apareça instantaneamente na "TV" (Painel Público) de todos os computadores.
-   **Prisma ORM**: Gerencia o banco de dados de forma segura e moderna.
-   **SQLite**: Banco de dados leve e portátil (arquivo `prisma/dev.db`), não requer instalação complexa.

---

## 📂 Estrutura do Código

### 1. `server.js` (O Coração do Sistema)
Este é o arquivo principal. Ele:
-   Inicia o servidor na porta 3000.
-   Gerencia as conexões em tempo real (`socket.on`).
-   Conversa com o banco de dados (Salva senhas, busca fila, atualiza status).
-   Possui a lógica de "Broadcast": Quando algo muda, ele avisa todo mundo (`io.emit`).

### 2. `src/context/SenhasContext.tsx`
É o "cérebro" do Frontend.
-   Mantém o estado local da aplicação (lista de senhas, lista de usuários).
-   Conecta-se ao `server.js` para enviar comandos (ex: `gerarSenha`, `chamarSenha`).
-   Ouve as atualizações do servidor e atualiza a tela automaticamente.

### 3. `src/components/` (As Telas)
-   **Home.tsx**: Menu principal.
-   **PainelPublico.tsx**: A tela da "TV". Mostra a senha atual bem grande e as últimas chamadas. Fala o nome da pessoa chamda.
-   **GeradorSenhas.tsx**: A tela do "Totem". Permite criar senhas (Normal/Prioritária), imprimir e ver o tamanho da fila.
-   **Atendente.tsx**: A tela do funcionário nos guichês. Permite selecionar qual usuário está logado, chamar a próxima senha, finalizar ou cancelar atendimento.
-   **Administrador.tsx**: Painel restrito (Senha: `admin123`). Permite cadastrar novos atendentes, excluir funcionários e zerar a fila do dia.

### 4. `prisma/`
-   **schema.prisma**: Define como os dados são salvos (Tabelas de `Senha`, `Usuario`, `Config`).
-   **dev.db**: O arquivo físico do banco de dados.

---

## 🛠️ Como Rodar o Projeto

### Pré-requisitos
-   Node.js instalado.

### Passo a Passo

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Configurar o Banco de Dados (Primeira vez):**
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Rodar o Servidor:**
    ```bash
    node server.js
    ```
    Ou, para desenvolvimento (com build automático):
    ```bash
    npm run dev
    ```

4.  **Acessar:**
    Abra o navegador em `http://localhost:3000`.

### Acessar de Outros Computadores (Rede Local)
Para usar o sistema em vários computadores (um sendo a TV, outro o Totem, outros os Guichês):
1.  Descubra o **IP** do computador onde rodou o `node server.js` (no terminal digite `ipconfig` no Windows).
2.  Nos outros computadores, digite o IP dele no navegador.
    *   Exemplo: `http://192.168.1.15:3000`

### Sincronização com GitHub (Windows)
Para facilitar a sincronização, incluímos dois scripts na raiz do projeto:
-   `salvar_no_github.bat`: Clique duas vezes, digite a descrição da mudança, e ele envia para a nuvem.
-   `baixar_do_github.bat`: Clique duas vezes para baixar as atualizações mais recentes do repositório.

---

## 🔐 Senhas de Acesso
-   **Painel Admin**: `admin123`

---

## 📝 Funcionalidades Principais
-   **Persistência**: Se reiniciar o servidor, as senhas e usuários continuam salvos.
-   **Sincronização Real**: O "Gerador" cria uma senha e ela aparece na hora na tela do "Atendente".
-   **Voz**: O Painel Público anuncia "Senha P005, Guichê 2" usando a voz do navegador.
-   **Fila Inteligente**: Prioritários furam a fila dos Normais automaticamente, mas respeitam a ordem de chegada entre si.

Desenvolvido para fins de prototipação e validação de fluxo de atendimento.