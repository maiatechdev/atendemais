---
name: semdesc-frontend
description: Use esta skill sempre que for escrever, alterar ou revisar código do frontend do Atende+ (SEMDESC) — telas em src/components, rotas, estilização Tailwind, consumo do SenhasContext/Socket.io, formulários, modais ou qualquer componente novo de UI. Garante que o código novo siga o mesmo estilo, arquitetura e convenções visuais já usados no projeto.
---

# Frontend do Atende+ (SEMDESC) — Guia de Arquitetura e Convenções

Companheiro do skill `semdesc-backend`. Leia isto inteiro antes de criar/alterar telas, componentes
ou lógica de estado no frontend. O objetivo é manter consistência com o que já existe — não
introduza uma biblioteca de UI, gerenciador de estado ou padrão de estilização diferente sem que o
usuário peça explicitamente.

## Stack

- **React 18 + TypeScript**, bundler **Vite** (`@vitejs/plugin-react-swc`), alias `@` → `src/`.
- **Roteamento**: `react-router-dom` (v7), com `BrowserRouter` simples em `src/App.tsx` — rotas
  todas declaradas ali, sem lazy loading, sem layouts aninhados.
- **Estilização**: Tailwind CSS com uma paleta customizada (`tailwind.config.js`), fonte Inter.
  **Não** é o modelo shadcn de tokens CSS via `hsl(var(--primary))` — é uma escala numérica clássica
  (`primary-50` … `primary-950`, `secondary-…`, `success-…`, `danger-…`, `warning-…`). Use essas
  classes diretamente (`bg-primary-600`, `text-secondary-900`, `border-secondary-200`), não invente
  novas cores soltas.
- **Ícones**: `lucide-react`, sempre importados nominalmente (`import { Lock, Mail } from
  'lucide-react'`).
- **Tempo real**: `socket.io-client`, consumido através de um único contexto global
  (`SenhasContext`) — nenhuma tela abre sua própria conexão de socket.
- **Gráficos** (dashboards admin): `recharts`.
- Outras libs instaladas (`@radix-ui/*`, `class-variance-authority`, `react-hook-form`, `sonner`,
  `cmdk`, `vaul`, etc.) fazem parte de um **kit de componentes shadcn/ui pré-gerado** em
  `src/components/ui/*` que veio de um import Figma→código (ver `src/Attributions.md` e a pasta
  `src/components/figma`). **Isso é boilerplate majoritariamente não usado pelas telas reais** —
  ver seção "O que NÃO fazer" abaixo antes de usar qualquer coisa de lá.

## Estrutura de pastas

```
src/
  App.tsx                 # Definição de todas as rotas (BrowserRouter + Routes)
  main.tsx                # Bootstrap do React (createRoot)
  index.css               # @tailwind base/components/utilities + import da fonte Inter
  context/
    SenhasContext.tsx      # ÚNICA fonte de estado global e de acesso ao socket
  components/
    Home.tsx               # Tela inicial (menu de módulos)
    PainelPublico.tsx       # Painel de TV (chamada de senha + voz + som)
    Atendente.tsx           # Tela do atendente (login próprio + fila + chamada)
    GeradorSenhas.tsx       # Totem de emissão de senha
    Administrador.tsx       # Painel admin (usuários, serviços, dashboard)
    auth/                   # LoginForm, LoginLayout, ChangePasswordModal — reusados pelas telas
    admin/                  # Subcomponentes só do painel admin (LiveDashboard, HistoryView, UsersOnlineList)
    ui/                     # Kit shadcn pré-gerado (majoritariamente não usado) + 2 componentes
                            # próprios de verdade: ChatWidget.tsx e BeneficiaryHistoryModal.tsx
    figma/                  # ImageWithFallback — utilitário herdado do import do Figma
  assets/                   # logo.svg etc.
  guidelines/Guidelines.md  # arquivo vazio (placeholder, não usar como fonte de verdade)
```

Cada tela em `src/components/*.tsx` (não em subpastas) é um **componente grande e autocontido**:
gerencia seu próprio login/estado de sessão quando precisa (ex.: `Atendente.tsx` e
`GeradorSenhas.tsx` têm cada um sua própria tela de login local, não existe um `AuthContext`
global nem rota protegida via router). Ao criar uma tela nova, siga esse modelo: um arquivo por
tela em `src/components/`, com todo o estado de UI local via `useState`/`useEffect`, e busca de
dados/ações via o hook `useSenhas()`.

## Estado global: `SenhasContext`

Tudo que envolve dados vindos do backend passa por **um único contexto** (`src/context/
SenhasContext.tsx`), consumido via o hook `useSenhas()`. Não crie um segundo contexto nem uma
lib de state management (Redux, Zustand, etc.) — o padrão do projeto é: um `Provider` no topo
(`App.tsx`), um `useRef<Socket>` guardando a conexão, vários `useState` para cada fatia de dado, e
uma função exposta por ação de negócio.

Ao adicionar uma feature nova que envolve dado do servidor:

1. **Interface TypeScript**: adicione/atualize a interface no topo de `SenhasContext.tsx`,
   espelhando 1:1 o model do Prisma (ver skill `semdesc-backend`). Datas chegam como string do
   socket e devem ser convertidas para `Date` no client quando fizer sentido (ver `parseDates` no
   listener de `stateUpdated`).
2. **Listener de broadcast**: se o servidor emite um evento novo (`xUpdated`), registre
   `socket.on('xUpdated', ...)` dentro do `useEffect` de conexão (o único `useEffect` que cria o
   socket, roda uma vez com `[]`) e atualize o `useState` correspondente.
3. **Método de ação**: exponha uma função no objeto de contexto que faz `socketRef.current.emit
   ('nome_do_evento', payload, callback)`. Duas variações usadas no projeto:
   - **Fire-and-forget** (não espera resposta, servidor vai rebroadcastar o estado): função
     síncrona, só faz `socket.emit(...)` sem callback (ex.: `chamarSenha`, `finalizarAtendimento`).
   - **Baseada em Promise** (a UI precisa saber se deu certo): retorna `new Promise((resolve,
     reject) => { socket.emit(evento, payload, (resp) => resp.success ? resolve(resp.data) :
     reject(resp.error) ) })` (ex.: `gerarSenha`, `login`, `agendar`).
   Siga o mesmo padrão que a ação já existente mais parecida usa — não misture os dois estilos
   para o mesmo tipo de operação.
4. Campos que o backend guarda como JSON serializado (`tiposAtendimento`) precisam de
   `JSON.parse`/`typeof === 'string'` check ao entrar no estado do client — repita o padrão já
   usado em `fetchInitialData` e nos listeners de `usersUpdated`.
5. Consuma a nova função/estado na tela via `const { minhaFuncao, meuEstado } = useSenhas();` —
   nunca acesse `socketRef` diretamente fora do contexto.

## Estilo visual e de componentes

- **Tailwind puro, sem abstração de componente**: os elementos (`<button>`, `<input>`, `<div>`)
  são escritos diretamente com classes utilitárias longas, incluindo estados (`hover:`, `focus:`,
  `disabled:`, `group-hover:`) e transições (`transition-all`, `duration-300`). Não extraia um
  `<Button>`/`<Input>` genérico a menos que o usuário peça — o padrão aqui é repetir as classes
  Tailwind inline em cada tela (visualmente elas variam ligeiramente por contexto: login vs. totem
  vs. admin).
- Paleta e "feel": fundo `bg-secondary-50`, texto principal `text-secondary-900`, texto secundário
  `text-secondary-500`/`400`, destaque em `primary-600`/`700`, cards brancos com
  `rounded-xl`/`rounded-2xl`, `shadow-soft` (definido em `tailwind.config.js`), bordas
  `border-secondary-100`/`200`. Erros usam `danger-*`, sucesso `success-*`, alertas `warning-*`.
- Ícones sempre de `lucide-react`, tamanho tipicamente `w-4 h-4` a `w-7 h-7` dependendo do
  contexto, cor herdada via `text-*`.
- Estados de carregamento: `Loader2` do lucide com `animate-spin` + texto (“Validando Acesso…”),
  não um spinner customizado.
- Modais são componentes próprios simples (ver `ChangePasswordModal`, `BeneficiaryHistoryModal`),
  não usam `Dialog` do Radix/shadcn — normalmente um `<div className="fixed inset-0 ...">` de
  overlay + card centralizado, controlado por `useState<boolean>` local (`isOpen`/`onClose` via
  props).
- Formulários são não controlados por lib nenhuma: `useState` por campo + `onSubmit` com
  `e.preventDefault()`. Não introduza `react-hook-form` (está instalado mas não é usado pelas
  telas reais) a menos que o usuário peça.
- Textos, labels, mensagens de erro e nomes de variáveis são **em português**, no mesmo tom direto
  do restante do projeto (ex.: "Credenciais inválidas", "Validando Acesso...").

## Alternativas de estilização (referência para decisão, não é o padrão atual)

O Tailwind utilitário inline é a convenção vigente e continua sendo o padrão por padrão — não
troque a abordagem de estilização por conta própria. Mas se o usuário pedir para avaliar ou migrar
para outra estratégia, aqui está a análise que um frontend sênior faria, já contextualizada para
este projeto (app híbrido: totem touch, painel de TV, telas de atendente/admin, mantido por uma
equipe pequena, rodando numa VPS simples):

| Opção | Quando faria sentido aqui | Trade-off principal |
|---|---|---|
| **Manter Tailwind (atual)** | Time pequeno, iteração visual rápida tela a tela, já dominado pelo time. | Classes longas/inline (o "className soup"); nenhuma abstração de componente visual. |
| **Finalizar a adoção do shadcn/ui já instalado** (`src/components/ui/*` + Radix + CVA, hoje quase sem uso real) | É o caminho de menor esforço/risco: as libs já estão no `package.json`, só falta configurar os tokens (`--primary` etc.) no `tailwind.config.js`/`index.css` e trocar `<button className="...">` por `<Button variant="...">`. Ganha consistência, acessibilidade dos primitivos Radix (foco, ARIA) e menos duplicação de estilos entre telas. | Ainda é Tailwind por baixo — não resolve "quero sair do Tailwind", só organiza o que já existe. Exige revisar todas as telas para trocar elementos crus pelos componentes. |
| **CSS Modules** (`Tela.module.css`, suporte nativo do Vite, zero dependência nova) | Se o objetivo for sair do utility-first mas manter CSS puro, sem runtime, com escopo automático por componente. Boa opção para quem prefere escrever CSS "de verdade" e reduzir JSX poluído por classes. | Perde a velocidade de prototipação do Tailwind (sem autocompletar de spacing/cores); precisa reimplementar a paleta como variáveis CSS (`:root { --primary-600: ... }`) para não perder consistência. |
| **CSS-in-JS zero-runtime** (vanilla-extract, Panda CSS, StyleX) | Faz sentido se o time quiser estilos type-safe colocados junto do componente TS, com tema centralizado, sem pagar custo de runtime em produção (diferente do styled-components/Emotion clássicos). É a escolha mais "moderna" para um projeto TypeScript novo. | Adiciona plugin de build (integração com Vite) e uma curva de aprendizado; comunidade/exemplos menores que Tailwind. Rewrite grande do que já existe. |
| **Bootstrap / React-Bootstrap** | Só faria sentido se a prioridade virasse "entregar telas administrativas padrão o mais rápido possível" e o visual atual (gradientes, cards com sombra suave, identidade "Atende+") pudesse ser sacrificado por um look mais genérico. Bootstrap já vem com modais, forms e grid prontos, reduzindo código customizado (`ChangePasswordModal`, `BeneficiaryHistoryModal` teriam menos boilerplate). | Visual genérico "Bootstrap-like" difícil de diferenciar sem sobrescrever bastante CSS; harder to reconciliar com a paleta customizada já validada visualmente (gradientes suaves, `shadow-soft`, cantos `rounded-2xl`). Normalmente não é a escolha de um time que já investiu numa identidade visual própria. |
| **Design system component completo** (Mantine, Ant Design, Chakra) | Interessante especificamente para o **painel Administrador** (tabelas, filtros, dashboards) — essas libs têm componentes de data table, date picker e formulário mais maduros que construir na mão. Poderia conviver com Tailwind puro nas telas de totem/painel público, que têm identidade visual mais própria. | Duas linguagens visuais no mesmo app (uma lib de componentes só no admin) exige disciplina para não vazar estilos de um lado para o outro; aumenta bundle e dependências. |
| **Sass/SCSS puro** | Caminho incremental mais simples se só quiser nesting, variáveis e mixins sem trocar de paradigma nem adicionar runtime — dá para conviver com o Tailwind atual (usar só onde fizer sentido) ou substituí-lo aos poucos. | Sass sozinho não resolve escopo de CSS (precisa de CSS Modules junto ou disciplina de nomenclatura tipo BEM) nem dá a velocidade de iteração do utility-first. |

**Recomendação caso o usuário peça para migrar de fato**: para este projeto especificamente, o
caminho de menor risco/maior retorno é **finalizar a adoção do shadcn/ui já instalado** (linha 2
da tabela) antes de considerar uma dependência nova — o custo de setup é baixo (tokens de tema) e
elimina a duplicação de classes Tailwind entre telas sem exigir uma reescrita completa. Só
recomende Bootstrap ou um design system completo se o usuário explicitamente disser que quer abrir
mão da identidade visual atual em troca de velocidade de entrega.

## Padrões específicos do domínio

- **Login por tela, não global**: `Atendente.tsx` e `GeradorSenhas.tsx`/`Administrador.tsx` cada
  um implementa seu próprio fluxo de autenticação local (estado `logado`, `usuarioLogado`,
  chamando `login()` do contexto), reaproveitando os componentes `LoginForm` + `LoginLayout` de
  `src/components/auth/`. Não centralize isso em rota protegida/`AuthContext` sem alinhar antes
  com o usuário — é uma mudança estrutural grande.
- **Configuração de sessão do atendente** (guichê/sala + tipos de atendimento) é feita em um modal
  próprio depois do login (`modalConfigOpen` em `Atendente.tsx`), persistida via
  `atualizarSessaoAtendente`. Ao adicionar um novo campo de sessão do atendente, siga esse mesmo
  fluxo (estado temporário `temp*` no modal → salvar → persistir no contexto/servidor).
- **Painel Público** (`PainelPublico.tsx`) usa a Web Speech API nativa do navegador
  (`window.speechSynthesis`, `SpeechSynthesisUtterance`) para anunciar senhas em voz alta — não
  adicione uma lib de TTS externa. Mantém esse padrão para qualquer anúncio sonoro novo.
- **Abertura de janelas**: o link para o Painel Público abre em uma nova janela via
  `window.open(path, 'PainelPublico', 'width=1280,height=720,...')` a partir de `Home.tsx`, em vez
  de navegar na mesma aba — assim ele pode ficar ligado numa TV separada. Siga esse padrão para
  telas pensadas para rodar em monitor dedicado.
- **Chat** (`ChatWidget.tsx`) e **histórico de beneficiário** (`BeneficiaryHistoryModal.tsx`) são
  os únicos componentes "reais" dentro de `src/components/ui/` — são usados em várias telas
  (`Atendente`, `GeradorSenhas`, `Administrador`) via import direto, sem passar por um sistema de
  design compartilhado. Se for estender esses componentes, siga o estilo interno deles (Tailwind
  puro + lucide), não o padrão shadcn dos vizinhos no mesmo diretório.
- **Dashboards do admin** (`src/components/admin/LiveDashboard.tsx`) usam `recharts` diretamente,
  alimentados por dados vindos do contexto (`senhas`, `buscarSenhasPeriodo`, etc.) — sem lib de
  state adicional para os gráficos.

## Como adicionar uma tela/feature nova de ponta a ponta

1. Confirme (ou peça ao usuário para criar, seguindo o skill `semdesc-backend`) o evento/estado
   de socket necessário no servidor.
2. Atualize `SenhasContext.tsx`: interface TS, estado (`useState`), listener se houver broadcast,
   função de ação que chama `socket.emit`.
3. Crie o arquivo da tela em `src/components/NomeDaTela.tsx` (PascalCase, um componente default
   export por arquivo), consumindo `useSenhas()`.
4. Registre a rota em `src/App.tsx` dentro de `<Routes>`.
5. Estilize com Tailwind inline seguindo a paleta e os componentes de referência mais próximos
   (login → `LoginForm.tsx`; tela cheia → `Home.tsx`/`Atendente.tsx`; modal → `ChangePasswordModal.tsx`).
6. Se a tela precisa de ícone no menu inicial, adicione uma entrada no array `modules` de
   `Home.tsx`.

## O que evitar

- Não use os componentes shadcn "crus" de `src/components/ui/` (`button.tsx`, `dialog.tsx`,
  `table.tsx`, `form.tsx`, etc.) nas telas reais só porque estão instalados — eles não são
  usados hoje em nenhuma tela do produto. Se o usuário pedir explicitamente para adotá-los ou
  quiser trocar a estratégia de estilização, veja a seção "Alternativas de estilização" acima
  antes de decidir — e alinhe o escopo com o usuário antes de migrar qualquer tela.
- Não crie um segundo contexto de estado, Redux, Zustand ou React Query — tudo passa por
  `SenhasContext` + Socket.io.
- Não adicione `react-hook-form`, `zod`, ou validação de schema a formulários novos sem pedido
  explícito — o padrão atual é `useState` simples por campo.
- Não centralize autenticação num guard de rota/`AuthContext` global sem alinhar antes — cada
  tela cuida do próprio login hoje.
- Não troque a paleta numérica do Tailwind por tokens `hsl(var(--x))` estilo shadcn — o
  `tailwind.config.js` deste projeto não está configurado para isso.
- Não presuma que texto/labels devem estar em inglês — todo o produto é em português (pt-BR),
  incluindo nomes de variáveis de domínio (`nome`, `guiche`, `atendente`, `bairro`).
