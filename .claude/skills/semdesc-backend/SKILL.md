---
name: semdesc-backend
description: Use esta skill sempre que for escrever, alterar ou revisar código do backend do Atende+ (SEMDESC) — server.js, schema.prisma, eventos de Socket.io, autenticação, ou qualquer feature nova que envolva persistência de dados ou comunicação em tempo real entre servidor e frontend. Garante que o código novo siga o mesmo estilo, arquitetura e convenções já usados no projeto.
---

# Backend do Atende+ (SEMDESC) — Guia de Arquitetura e Convenções

Este skill documenta como o backend deste projeto foi construído, para que qualquer código novo
seja consistente com o que já existe. Antes de implementar uma feature nova no backend, leia isto
inteiro. Não introduza padrões diferentes (REST, controllers separados, ORM diferente, etc.) sem
que o usuário peça explicitamente — o projeto é intencionalmente monolítico e simples.

## Stack

- **Runtime**: Node.js com ES Modules (`"type": "module"` no `package.json`).
- **Servidor HTTP**: Express 5 (`express`), usado quase só para servir o build do Vite/React.
  Não existem rotas REST de API — toda a comunicação de dados é via **Socket.io**.
- **Tempo real**: `socket.io` (servidor) + `socket.io-client` (frontend). É o único canal de
  comunicação cliente↔servidor para dados de negócio (filas, usuários, agendamentos, chat).
- **ORM / Banco**: Prisma (`@prisma/client`) sobre **MySQL/MariaDB** (Hostinger VPS em produção).
  Em dev local pode existir um `prisma/dev.db` (SQLite) apenas de resquício histórico — o
  `schema.prisma` atual está configurado para `provider = "mysql"`.
- **Senhas**: `bcryptjs` para hash. Existe compatibilidade com senhas legadas em texto puro (ver
  seção Autenticação).
- **Build/dev**: Vite. Em desenvolvimento o `server.js` usa o Vite em `middlewareMode` embutido no
  Express; em produção serve os arquivos estáticos de `dist/`.
- **Deploy/processo**: PM2 (`ecosystem.config.cjs`), pensado para rodar 24h numa VPS.
- **Frontend**: React 18 + TypeScript + Tailwind + Radix UI (`src/components/ui`), consumindo o
  socket via um Context (`src/context/SenhasContext.tsx`).

## Arquitetura geral

O backend inteiro vive em **um único arquivo `server.js`**, dentro de uma função `async function
startServer()`. Não há pastas `routes/`, `controllers/`, `services/` ou `models/` — é um estilo
deliberadamente monolítico e direto. Ao adicionar uma feature:

1. **Não crie uma arquitetura em camadas nova.** Adicione o handler no lugar certo dentro de
   `server.js`, seguindo o agrupamento por seções já existente (comentários banner tipo
   `// --- AUTH EVENTS ---`, `// --- ADMIN EVENTS ---`, `// --- APPOINTMENT EVENTS ---`,
   `// --- CHAT EVENTS ---`).
2. Cada evento de socket é numerado com comentário (`// 7. Get Users`) — mantenha a numeração /
   estilo de comentário ao inserir um novo handler na seção certa.
3. Toda a lógica de negócio roda dentro do callback `io.on('connection', async (socket) => { ... })`.
   Handlers ficam registrados com `socket.on('nome_do_evento', async (payload, callback) => {...})`.

### Padrão de request/response via Socket.io

Não existe req/res HTTP para dados — o padrão é:

```js
socket.on('nome_da_acao', async (data, callback) => {
    try {
        // ... lógica com prisma ...
        if (callback) callback({ success: true, data: resultado });
    } catch (e) {
        console.error('Erro em nome_da_acao:', e);
        if (callback) callback({ success: false, error: e.message });
    }
});
```

Regras:
- Sempre envolva a lógica em `try/catch`.
- Sempre logue o erro com `console.error` incluindo o nome do evento como contexto.
- Sempre responda via `callback` (se existir) com o formato `{ success: boolean, data?, error? }`.
- Nomes de eventos que são **comandos/ações do cliente** usam `snake_case`
  (`request_ticket`, `call_ticket`, `admin_create_user`, `schedule_appointment`).
- Nomes de eventos que são **broadcasts de estado do servidor** usam `camelCase`
  (`stateUpdated`, `usersUpdated`, `servicesUpdated`, `appointmentsUpdated`) — exceto os de chat,
  que seguem `chat_*` (`chat_new_message`) por consistência com o prefixo do domínio.

### Padrão de "estado global" e broadcast

Existe uma função `getFullState()` que agrega os dados centrais (fila de senhas, senha atual,
últimas chamadas, contadores) num único objeto. Sempre que uma mutação relevante acontece
(criar senha, chamar senha, mudar status, resetar fila), o handler:

1. Executa a mutação via Prisma.
2. Chama `const newState = await getFullState();`.
3. Emite para **todos os clientes conectados**: `io.emit('stateUpdated', newState);`.

Para domínios que não fazem parte do estado central (usuários, serviços, agendamentos, chat),
o mesmo padrão se repete, mas com eventos próprios: busca a lista atualizada inteira do
recurso e faz `io.emit('usersUpdated', lista)`, `io.emit('servicesUpdated', lista)`,
`io.emit('appointmentsUpdated', { date, data })`, etc. **Não** tente fazer updates parciais/
otimistas no servidor — o padrão do projeto é sempre re-buscar a lista/estado inteiro e
broadcastar de novo. É simples e evita bugs de sincronização, ao custo de eficiência — isso é
aceitável dado o volume de dados do sistema (fila de atendimento local).

Mensagens de chat privadas são a exceção: em vez de broadcast para todos, o servidor descobre
os sockets do autor e do destinatário (`onlineUsers` Map) e usa `io.to(socketId).emit(...)`
para os dois lados apenas.

### Rastreamento de usuários online

Dois estruturas em memória (não persistidas, resetam ao reiniciar o servidor):
- `onlineUsers`: `Map<socketId, userId>` — para saber a quem pertence cada conexão.
- `connectedUserIds`: `Set<userId>` — para saber quem está online (um usuário pode ter mais de
  um socket, ex.: duas abas abertas).

Ao logar (`login`) adiciona nos dois; ao deslogar (`logout`) ou desconectar (`disconnect`),
remove do `Map` e só remove do `Set` se não sobrar nenhum outro socket daquele usuário. Depois
sempre rebroadcasta a lista de usuários com o campo calculado `online: connectedUserIds.has(u.id)`.

## Autenticação

- Não há JWT nem sessão HTTP — o "login" é uma chamada de socket (`login`) que retorna os dados
  do usuário via callback, e o frontend guarda esse usuário em memória/contexto.
- **Compatibilidade com senha legada em texto puro**: ao logar, primeiro compara
  `user.senha === password` (texto puro). Se bater, faz auto-migração para hash bcrypt na hora
  (`bcrypt.hash` + `prisma.usuario.update`). Se não bater, tenta `bcrypt.compare`. Mantenha esse
  padrão de auto-migração em qualquer fluxo que leia senha (ex.: `change_password` também
  verifica os dois formatos antes de trocar).
- Novas senhas (criação/edição de usuário, troca de senha) **sempre** são gravadas como hash
  bcrypt (`bcrypt.genSalt(10)` + `bcrypt.hash`), nunca em texto puro.
- Existe um usuário "protegido" (`maiatechdev@gmail.com`) que não pode ser excluído — ver
  `admin_delete_user`. Ao adicionar novas operações destrutivas sobre usuários, considere se essa
  proteção deve se aplicar também.
- Não existe verificação de permissão/role granular no servidor além de `isAdmin` — os eventos
  `admin_*` confiam que o frontend só os expõe para administradores. Se for adicionar uma ação
  sensível nova, siga esse mesmo nível de confiança (não adicione middleware de auth complexo
  sem alinhar com o usuário primeiro).

## Modelagem de dados (Prisma / `prisma/schema.prisma`)

- Banco: MySQL/MariaDB (`datasource db { provider = "mysql" }`), string de conexão em
  `DATABASE_URL` no `.env`.
- Todos os models usam `id String @id @default(uuid())` (exceto `Config`, que usa `key String @id`
  como chave — é uma tabela chave/valor genérica para configurações e contadores, ex.:
  `contadorNormal`, `contadorPrioritaria`, `lastResetDate`).
- Nomes de models e campos em **português**, no domínio do negócio (`Senha`, `Usuario`,
  `Agendamento`, `Servico`, `Mensagem`). Siga essa convenção em qualquer model novo — não misture
  inglês.
- Campos que guardam listas/estruturas usam **JSON serializado como String** (`tiposAtendimento`
  em `Usuario`, `@db.Text`), não um relacionamento separado. Ao ler, sempre `JSON.parse`; ao
  gravar, `JSON.stringify(valor || [])`. Siga esse padrão para novos campos "lista de algo" em vez
  de criar uma tabela de junção, a menos que o usuário peça relacionamento normalizado.
- Textos longos (`observacoes`, `texto` de mensagem) usam `@db.Text`.
- Datas usam `DateTime` com `@default(now())` quando é "criado em"; campos de hora opcionais
  (`horaChamada`, `horaInicio`, `horaFinalizacao`) são `DateTime?`.
- Depois de alterar `schema.prisma`, sempre gerar uma migration (`npx prisma migrate dev --name
  descricao_da_mudanca` em dev, ou documentar que precisa rodar `prisma migrate deploy` em
  produção — ver `README.md` e `package.json` script `migrate:deploy`). Nunca edite o banco de
  produção manualmente.

## Fluxo de fila (domínio central)

- Um "ticket" é o model `Senha`. Estados possíveis (`status`): `aguardando`, `chamada`,
  `atendendo`, `concluida`, `cancelada`, `ausencia`.
- Numeração: prefixo por prioridade (`N` normal, `P` prioritaria, `P+` prioritaria+) + contador
  zero-padded de 3 dígitos, guardado na tabela `Config` (`contadorNormal` / `contadorPrioritaria`).
  Incrementar o contador é feito com `prisma.config.update` logo após ler o valor atual — não é
  transacional/atômico contra concorrência pesada, mas é o padrão aceito no projeto (baixo volume
  de escrita simultânea nesse domínio).
- Chamar a próxima senha (`call_ticket`) usa `updateMany` com `where: { status: 'aguardando' }`
  como forma de garantir atomicidade otimista: se `result.count > 0`, a senha foi
  "reservada" com sucesso; caso contrário, outro atendente já pegou. Ao implementar ações
  concorrentes similares, prefira esse padrão de "updateMany condicional + checar count" a fazer
  find + update separados.
- Reset diário automático (`checkDailyReset`, chamado no boot e a cada hora via `setInterval`):
  zera os contadores e cancela senhas pendentes do dia anterior. Se adicionar um novo contador ou
  estado diário, cuidar de integrá-lo aqui.

## Estilo de código

- **Comentários e mensagens de log em português**, tom direto e às vezes com tags entre colchetes
  para contexto (`[Security]`, `[Daily Reset]`, `[Call Ticket]`, `[DEBUG]`). Siga esse padrão em
  código novo: prefira `console.log('[NomeDaFeature] mensagem...')` a logs genéricos.
- Não há testes automatizados de backend nem linting configurado especificamente para
  `server.js` — não adicione dependências de teste/framework novas sem alinhar com o usuário.
  Existe `scripts/test_communication.mjs`, um script manual de smoke-test via socket.io-client;
  siga esse mesmo estilo (script solto que conecta via socket e verifica respostas) se for pedido
  um teste de fluxo.
- CommonJS vs ESM: `server.js` é ESM (`import`), mas usa `createRequire` para importar
  `@prisma/client` e `bcryptjs` via `require` (compatibilidade). Siga esse mesmo truque se precisar
  importar um pacote CJS dentro do `server.js`.
- Variáveis e nomes de payload são em português, espelhando os campos do Prisma (`nome`, `cpf`,
  `telefone`, `bairro`, `atendente`, `guiche`).

## Como o frontend consome isso

- `src/context/SenhasContext.tsx` cria a conexão `socket.io-client` e expõe:
  - Interfaces TypeScript que espelham 1:1 os models do Prisma (`Senha`, `Agendamento`,
    `Servico`, `Usuario`, `ChatMessage`) — ao mudar um campo no `schema.prisma`, atualize também
    a interface correspondente aqui.
  - Métodos que fazem `socket.emit('evento', payload, callback)` envolvendo a Promise/callback
    do socket.io.
  - Listeners `socket.on('stateUpdated', ...)`, `socket.on('usersUpdated', ...)` etc. que
    atualizam o estado do React quando o servidor faz broadcast.
- Ao adicionar uma feature de ponta a ponta, o fluxo esperado é:
  1. Atualizar `schema.prisma` (se precisar de novo campo/model) + gerar migration.
  2. Adicionar o handler do evento em `server.js`, na seção correta, seguindo o padrão
     try/catch + callback `{success, data/error}` + broadcast se afetar estado compartilhado.
  3. Se o novo dado faz parte do estado central, incluir em `getFullState()`; senão, criar/usar
     um evento de broadcast próprio (`xUpdated`).
  4. Espelhar a interface TS e adicionar o método correspondente em `SenhasContext.tsx`.
  5. Consumir no componente React (em `src/components/...`), usando o hook do contexto.

## Variáveis de ambiente (`.env`, ver `.env.example`)

- `DATABASE_URL`: string de conexão MySQL/MariaDB.
- `PORT`: porta do `server.js` (padrão 3001).
- `NODE_ENV`: `production` ativa build estático + desativa o Vite middleware.
- `FRONTEND_URL` (opcional): restringe CORS do socket.io a um domínio específico; vazio = mesmo
  domínio serve tudo (recomendado em VPS única).

## O que evitar

- Não crie uma camada REST/API separada para algo que pode ser um evento de socket — o projeto
  não usa REST para dados de negócio.
- Não separe o código em múltiplos arquivos de rota/controller sem que o usuário peça — a
  convenção atual é um `server.js` único.
- Não troque o padrão de broadcast "recarregar lista inteira" por atualizações incrementais
  complexas sem necessidade real de performance.
- Não grave senha em texto puro em nenhum fluxo novo.
- Não presuma SQLite — o projeto migrou para MySQL/MariaDB; `prisma/dev.db` é resquício.
