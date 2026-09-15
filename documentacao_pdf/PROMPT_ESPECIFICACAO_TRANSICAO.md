# Prompt — Documento de Especificação Técnica para Transição (Atende+ / SEMDESC)

> Como usar: cole o conteúdo entre as linhas `=== INÍCIO DO PROMPT ===` e `=== FIM DO PROMPT ===`
> em uma conversa nova com o Claude. Se estiver usando o Claude Code com acesso ao repositório
> `atendemais/`, diga isso a ele antes de colar — ele vai ler o código real para confirmar/ajustar
> os detalhes técnicos. Se for usar no claude.ai sem acesso ao repositório, o prompt já é
> autossuficiente (todo o contexto necessário está embutido nele).

=== INÍCIO DO PROMPT ===

Você é um(a) analista de sistemas e arquiteto(a) de software sênior, especializado(a) em
documentação técnica formal para **transição de desenvolvimento (handover)** entre uma
desenvolvedora atual e uma **empresa terceirizada** que vai assumir integralmente o
desenvolvimento, hospedagem e evolução do sistema a partir de agora — inclusive reescrevendo-o
do zero, se julgarem necessário.

Sua tarefa é produzir um **documento único, formal e completo de especificação de software**,
que sirva como fonte da verdade para a nova equipe entender o domínio, o negócio, os fluxos e o
comportamento esperado do sistema, sem depender de conversas com a desenvolvedora anterior.

## Contexto do sistema (Atende+)

O **Atende+** é um sistema de gerenciamento de filas e atendimento presencial usado pela
**SEMDESC** (secretaria/órgão municipal), na **Prefeitura de Lauro de Freitas (BA)**, para
organizar o atendimento ao cidadão em programas sociais (há indícios de uso ligado a um
programa de "Bolsa Aluguel"/benefício habitacional). Hoje roda em produção em
`atendemais.semdesc.com`.

Stack atual (contexto técnico — a nova equipe pode decidir manter ou substituir):
- **Backend**: Node.js + Express + Socket.io (comunicação em tempo real), Prisma ORM.
- **Frontend**: React + Vite + TailwindCSS, roteamento com React Router.
- **Banco de dados**: MySQL/MariaDB.
- **Infra atual**: hospedagem compartilhada (Hostinger Business), sem SSH/VPS — o novo
  fornecedor provavelmente migrará para uma infraestrutura própria; documente os requisitos de
  forma agnóstica de provedor.

### Módulos / telas do sistema

1. **Painel Público (TV)** — exibição pública, sem login. Mostra a senha em chamada em destaque
   e o histórico das últimas chamadas; toca som de campainha e anuncia por voz (ex: "Senha
   Preferencial 001, Guichê 2").
2. **Gerador de Senhas (Totem)** — interface touch para o cidadão (ou operado pela Recepção)
   retirar senha. Escolhe tipo de atendimento e prioridade (Normal / Prioritária / Prioridade
   especial); coleta opcionalmente Nome, CPF, Telefone, Bairro. Valida se o CPF já foi usado com
   um nome diferente (alerta de possível erro de digitação/duplicidade).
3. **Área do Atendente** — requer login. O atendente escolhe, a cada sessão de trabalho (não é
   fixo no cadastro), seu **Guichê ou Sala** e quais **serviços** atende naquele momento. A partir
   daí: visualiza a fila em tempo real, chama a próxima senha (fila prioriza automaticamente por
   nível de prioridade e, dentro do mesmo nível, por ordem de chegada), pode escolher uma senha
   específica da fila, inicia e finaliza o atendimento, marca "Não Apareceu" (senha some da fila
   ativa após tentativas), repete o anúncio da senha atual, consulta o **histórico de atendimentos
   de um beneficiário por CPF**, gerencia **agendamentos** futuros e usa um **chat interno** para
   se comunicar com outros funcionários/administradores.
4. **Painel Administrativo** — acesso restrito ao perfil Administrador. Gerencia usuários (criar,
   editar, excluir, definir função/perfil), gerencia o catálogo de serviços disponíveis (ativar/
   desativar), acompanha usuários online em tempo real, vê um dashboard ao vivo com métricas
   (tamanho da fila, tempo médio de espera), consulta relatórios por período, e pode resetar a
   fila do dia.

### Perfis de usuário (funcionários) — descreva cada um como persona no documento

- **Atendente**: realiza o atendimento propriamente dito. Vinculado, por sessão, a um
  guichê/sala e a um conjunto de serviços. Interage com a fila, com o beneficiário e com o chat
  interno.
- **Recepção** (também chamada de "Gerador" no cadastro interno): responsável pela triagem
  inicial e emissão de senhas — normalmente auxilia cidadãos que não conseguem operar o totem
  sozinhos, ou faz atendimento presencial na entrada.
- **Administrador**: não participa da fila de atendimento; configura o sistema (usuários,
  serviços, parâmetros da fila), monitora operação em tempo real e gera relatórios.
- **Cidadão/Munícipe**: ator externo, não autenticado, que retira a senha no totem e acompanha
  a chamada no painel público.

### Regras de negócio centrais (confirme e detalhe no documento)

- A fila tem 3 níveis de prioridade (`normal`, `prioritaria`, `prioritaria+` — esta última para
  casos de prioridade especial, ex. idosos 80+, conforme legislação de atendimento prioritário).
  Ao chamar a próxima senha automaticamente, o sistema ordena por prioridade decrescente e, dentro
  do mesmo nível, por ordem de geração (FIFO).
- Um atendente só pode chamar senhas dos tipos de serviço configurados na sua sessão atual.
- Um atendente pode escolher manualmente uma senha específica da fila (fora da ordem automática).
- "Não Apareceu" tira a senha da fila ativa sem concluir o atendimento; há contagem de
  tentativas.
- Senhas têm numeração própria por tipo (prefixo N/P/P+) com contador incremental reiniciável.
- Login com senha criptografada (bcrypt); há suporte a troca de senha pelo próprio usuário; havia
  uma rotina legada de migração automática de senhas em texto puro para hash — decida com a nova
  equipe se isso ainda é necessário manter.
- Dados sensíveis envolvidos: CPF, nome, telefone, bairro do cidadão — trate como dados pessoais
  sob a LGPD.

Se você tiver acesso ao código-fonte do repositório `atendemais/` (schema Prisma, `server.js`,
componentes em `src/components/`), **leia-o antes de escrever** para confirmar ou corrigir os
detalhes acima, extrair todos os eventos de Socket.io existentes (payloads de entrada/saída) e
capturar qualquer regra de negócio que eu não tenha descrito aqui. Se não tiver acesso ao
código, trabalhe com o contexto acima e sinalize claramente, no próprio documento, quais pontos
precisam de validação com o time atual antes da equipe nova assumir.

## O que o documento deve conter

Produza um documento formal de especificação de software, em português, com a seguinte estrutura
(ajuste nomes/numeração conforme fizer sentido, mas não pule seções):

1. **Capa e controle de versão** — nome do sistema, órgão (Prefeitura de Lauro de Freitas /
   SEMDESC), data, versão do documento, histórico de revisões.
2. **Sumário executivo** — o que é o sistema, para quem, por que existe, contexto da transição de
   fornecedor.
3. **Glossário** — todos os termos de domínio (senha, guichê, sala, prioridade, atendente etc.).
4. **Visão geral do sistema e objetivos de negócio**.
5. **Atores e perfis de usuário (personas)** — um cartão por persona (Atendente, Recepção,
   Administrador, Cidadão), com responsabilidades, objetivos e nível de acesso.
6. **Arquitetura da solução** — diagrama de componentes (frontend, backend, banco, comunicação em
   tempo real), descrito de forma agnóstica de fornecedor de hospedagem.
7. **Modelo de dados** — diagrama entidade-relacionamento e dicionário de dados completo de cada
   entidade (senha/ticket, usuário, serviço, agendamento, mensagem, configuração).
8. **Requisitos funcionais** — numerados (RF-001, RF-002...), agrupados por módulo (Totem, Painel
   Público, Atendente, Admin, Agendamento, Chat, Relatórios).
9. **Requisitos não funcionais** — numerados (RNF-001...): desempenho (latência do tempo real),
   disponibilidade, segurança (autenticação, hashing, LGPD/dados pessoais), usabilidade
   (acessibilidade para totem touch e painel público), auditabilidade, portabilidade de
   hospedagem.
10. **Regras de negócio** — numeradas (RN-001...), incluindo o algoritmo de priorização da fila
    por extenso.
11. **Casos de uso** — numerados (UC-001...), cada um com: ator, pré-condições, fluxo principal,
    fluxos alternativos/exceções, pós-condições. Cobrir no mínimo: retirar senha, chamar próxima
    senha, atender e finalizar, marcar ausência, repetir chamada, agendar atendimento, consultar
    histórico por CPF, gerenciar usuários, gerenciar serviços, resetar fila, enviar mensagem no
    chat.
12. **Histórias de usuário** — no formato "Como [persona], quero [ação], para [benefício]", com
    critérios de aceite em Gherkin (Dado/Quando/Então).
13. **Fluxogramas** — em Mermaid, cobrindo pelo menos: ciclo de vida de uma senha (geração →
    chamada → atendimento → conclusão/ausência), algoritmo de chamada com prioridade, login e
    configuração de sessão do atendente, fluxo de agendamento, fluxo administrativo de
    gerenciamento de usuários/serviços.
14. **Catálogo de eventos/API em tempo real** — tabela com cada evento (nome, quem emite, quem
    escuta, payload de entrada, payload de resposta, efeito colateral).
15. **Segurança e privacidade** — tratamento de CPF e dados pessoais, controle de acesso por
    perfil, boas práticas recomendadas para a reescrita (ex: JWT, rate limiting, RBAC explícito).
16. **Requisitos de implantação** — ambientes (dev/homologação/produção), variáveis de ambiente
    necessárias, estratégia de deploy, backup de banco.
17. **Critérios de aceite e plano de testes** (alto nível) — o que precisa ser validado antes de
    considerar a reescrita/entrega pronta.
18. **Roadmap e débito técnico conhecido** — funcionalidades desejadas mas não implementadas,
    limitações conhecidas do sistema atual que a nova equipe deveria resolver.
19. **Anexos** — dicionário de dados completo, lista de variáveis de ambiente, glossário de
    status de senha.

## Identidade visual do documento

O documento final deve ser entregue como **um único arquivo HTML autocontido**, pronto para ser
impresso/exportado em PDF, com aparência de documento oficial de prefeitura:

- **Paleta**: azul-marinho (navy) institucional como cor primária — use algo na faixa de
  `#0A2647` a `#0E2A5E` para cabeçalhos, capa e barras de navegação/seção, branco como fundo de
  conteúdo, um tom de azul mais claro (`#1E4E8C` a `#2C6BB0`) para subtítulos e destaques, e
  cinza-chumbo (`#2B2B2B`) para o texto de corpo. Evite qualquer paleta colorida "de startup"
  (roxo/índigo) — o tom deve ser sóbrio, institucional, de identidade de governo municipal.
  **Se a equipe tiver acesso ao manual de identidade visual oficial da Prefeitura de Lauro de
  Freitas, substitua estes tons pelos códigos hexadecimais exatos do manual.**
- **Capa**: título do sistema, subtítulo "Especificação Técnica para Transição de
  Desenvolvimento", nome do órgão (Secretaria/SEMDESC — Prefeitura Municipal de Lauro de
  Freitas), espaço reservado para o brasão do município, data e versão.
- **Cabeçalho/rodapé de seção**: use barras em azul-marinho com o número/título da seção; rodapé
  com número de página e nome do documento.
- **Sumário** clicável no início (âncoras internas).
- Diagramas Mermaid devem ser estilizados para contraste legível sobre fundo branco, usando os
  tons de azul da paleta acima em vez das cores padrão do Mermaid.
- Tabelas de requisitos com cabeçalho em azul-marinho e texto branco, linhas zebradas em
  cinza muito claro.
- O HTML deve funcionar tanto em tela quanto impresso (considerar `@media print`: sem sombras
  fortes, quebras de página entre seções principais).

## Regras finais

- Escreva para uma equipe que **nunca viu o sistema rodando** — não pressuponha conhecimento
  tácito.
- Onde houver ambiguidade ou informação que você não conseguiu confirmar (nem pelo contexto
  acima, nem pelo código, se tiver acesso a ele), **não invente**: marque explicitamente como
  "⚠️ A confirmar com a equipe atual" dentro do próprio texto.
- Seja exaustivo(a) nos requisitos funcionais e casos de uso — este documento substitui todo o
  conhecimento tácito da desenvolvedora atual.
- Não adicione seções de marketing ou floreios; o tom é técnico e formal, mas continua sendo
  um documento de leitura humana, não apenas uma lista seca.

=== FIM DO PROMPT ===
