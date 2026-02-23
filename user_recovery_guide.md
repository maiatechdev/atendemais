# 🔐 Recuperação de Usuários - Atende+

## ✅ BOAS NOTÍCIAS: Seus Usuários NÃO Foram Apagados!

Verifiquei o banco de dados e **todos os 10 usuários que você criou ontem ainda estão lá!** 🎉

---

## 👥 Usuários Cadastrados no Sistema

| Nome | Email | Função | Status |
|------|-------|--------|--------|
| Lucas Andrade | lucas.andr97@gmail.com | Administrador | ✅ Ativo |
| Daniela Costa | danielacostacosta142@gmail.com | Gerador | ✅ Ativo |
| Gabriel Maia | maiatechdev@gmail.com | Administrador | ✅ Ativo |
| Tecnica 04 | belinesiqueira@gmail.com | Atendente | ✅ Ativo |
| Tecnica 03 | barbara.regina78@hotmail.com | Atendente | ✅ Ativo |
| Contratos | jenifer021@gmail.com | Atendente | ✅ Ativo |
| Jayne Souza | oliverjayy05@gmail.com | Gerador | ✅ Ativo |
| Carmem Aras | eucarmenaras@gmail.com | Atendente | ✅ Ativo |
| Financeiro | almeidaanderson239@gmail.com | Atendente | ✅ Ativo |
| Gilnadson Brito | zacknard.brito@gmail.com | Administrador | ✅ Ativo |

---

## 🔍 O Que Acontece com o Reset Diário?

O sistema tem um **reset automático diário** que funciona assim:

### ✅ O que É PRESERVADO:
- ✅ **Usuários** - Todos os cadastros de usuários permanecem
- ✅ **Serviços** - Configurações de tipos de atendimento
- ✅ **Configurações** - Guichês e permissões

### ⚠️ O que É RESETADO:
- ⚠️ **Senhas/Tickets** - Fila de atendimento é zerada
- ⚠️ **Contadores** - Voltam para N001, P001, P+001

**Código responsável**: [server.js:48-98](file:///c:/Users/SEMDESC/Documents/Atende+%20Web%20App%20Prototype/server.js#L48-L98)

> **Importante**: O reset diário **NÃO apaga usuários**, apenas limpa a fila de senhas!

---

## 🔧 Possíveis Causas do Problema de Login

### 1. Senha Incorreta
As senhas foram criptografadas com bcrypt. Se você não lembra a senha que definiu:

**Solução**: Use um administrador para resetar a senha do usuário.

### 2. Email Digitado Incorretamente
O login usa o **email exato** cadastrado.

**Solução**: Confira a lista acima e use o email exatamente como está.

### 3. Servidor Não Estava Rodando
Se o servidor não estava ativo ontem, os cadastros podem não ter sido salvos.

**Solução**: Verifique se o servidor está rodando agora em http://localhost:3001

---

## 🔑 Como Resetar Senha de um Usuário

### Opção 1: Via Administrador (Recomendado)

1. Faça login como **admin** (senha: admin)
2. Vá em **Gerenciar Usuários**
3. Clique em **Editar** no usuário desejado
4. Digite uma **nova senha** no campo "Senha"
5. Clique em **Salvar**

### Opção 2: Via Código (Avançado)

Execute este script para resetar a senha de um usuário específico:

```javascript
// reset_user_password.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword(email, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    await prisma.usuario.update({
        where: { email },
        data: { senha: hash }
    });
    
    console.log(`✅ Senha resetada para: ${email}`);
    await prisma.$disconnect();
}

// Exemplo: resetar senha do usuário
resetPassword('lucas.andr97@gmail.com', '123456');
```

---

## 🧪 Teste de Login

Para testar se um usuário consegue fazer login:

1. Acesse: http://localhost:3001
2. Use um dos emails da tabela acima
3. Tente a senha que você definiu

**Se não lembrar a senha**:
- Use o admin (email: `admin`, senha: `admin`) para resetar

---

## 📊 Verificar Usuários no Banco

Para ver todos os usuários cadastrados:

```bash
node inspect_db.js
```

Ou use o Prisma Studio:

```bash
npx prisma studio
```

---

## 🚨 Senhas Padrão Conhecidas

Se você usou senhas padrão ao criar os usuários:

- **admin** → senha: `admin`
- Outros usuários → senha padrão: `123456` (se não foi especificada)

---

## 💡 Recomendações

1. **Anote as senhas** dos usuários em um local seguro
2. **Use senhas fortes** para administradores
3. **Teste o login** logo após criar um usuário
4. **Faça backup** do banco de dados periodicamente:
   ```bash
   copy prisma\dev.db prisma\backup_dev.db
   ```

---

## 🔄 Próximos Passos

1. Tente fazer login com os emails da tabela acima
2. Se não lembrar a senha, use o admin para resetar
3. Se ainda tiver problemas, me avise qual erro aparece na tela

**Servidor rodando em**: http://localhost:3001
