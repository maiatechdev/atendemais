# Guia — Liberar Acesso à Hospedagem (Hostinger)

**Sistema:** Atende+ (SEMDESC)
**Para:** Gabinete
**De:** Gabriel Maia

> **Nota:** este guia foi escrito antes de confirmarmos que o plano contratado é **Hostinger
> Business (hospedagem compartilhada)**, não uma VPS. Nesse plano não existe acesso SSH — todo o
> trabalho é feito pelo **hPanel** (painel de controle da Hostinger) e sua API. O Passo 2
> (chave SSH) abaixo não se aplica; foi mantido corrigido apenas como referência histórica.
> Acesso ao hPanel sozinho já é suficiente para tudo.

---

## Passo 1 — Me adicionar como colaborador no hPanel

1. Acesse o **hPanel** (painel da Hostinger) com sua conta.
2. Vá em **Conta / Configurações da conta → Equipe** (em alguns painéis aparece como *"Team"* ou
   *"Compartilhar acesso"*).
3. Clique em **Convidar / Adicionar membro**.
4. Use este e-mail para o convite:

   ```
   maiatechdev@gmail.com
   ```

5. Quando for pedido **qual serviço** liberar, selecione **apenas a VPS/hospedagem do Atende+**
   (não a conta inteira, se der para escolher).
6. Quando for pedido o **nível de permissão**, escolha o nível mais alto disponível para esse
   serviço específico (preciso conseguir mexer em banco de dados, domínio e arquivos).

> Se essa opção de "Equipe" não aparecer no seu painel (alguns planos mais simples não têm),
> pule para o **Passo 2** e me chame para combinarmos a alternativa.

---

## Passo 2 — (Não se aplica neste plano)

Este plano de hospedagem não tem acesso SSH nem VPS — não existe "servidor" separado para
liberar chave de acesso. O acesso ao hPanel do Passo 1 já é suficiente para tudo: criar bancos de
dados, subdomínios e implantar o sistema, tudo pelo painel/API da própria Hostinger.

---

## O que eu vou fazer depois de ter acesso

Só para deixar transparente o que acontece depois da liberação:

1. Criar o banco de dados MySQL e as tabelas do sistema pelo hPanel.
2. Criar o site (ou subdomínio) e configurar o app Node.js pelo gerenciador de apps do próprio
   hPanel — ele cuida de instalar dependências, gerar o build e manter o processo rodando 24h,
   sem precisar de VPS, PM2 ou Nginx.
3. Subir o código do Atende+ e deixá-lo rodando.
4. Testar tudo antes de avisar que está no ar.

### Estrutura de domínios

O Atende+ roda no subdomínio `atendemais.semdesc.com`. A raiz `semdesc.com` é reservada para um
**portal** que vai reunir outros sistemas da SEMDESC no futuro, cada um em seu próprio
subdomínio — assim dá para adicionar sistemas novos sem afetar os que já estão no ar.

---

## Segurança

- Assim que o acesso for liberado, o primeiro login do sistema (usuário administrador) terá a
  senha alterada imediatamente por segurança.
- Se em algum momento você quiser revogar meu acesso, basta remover meu usuário na tela de
  **Equipe** do hPanel e/ou remover a chave SSH — não afeta o funcionamento do sistema.

---

Qualquer dúvida em algum desses passos, me chame que eu explico por chamada de vídeo ou faço um
passo a passo com print de tela.
