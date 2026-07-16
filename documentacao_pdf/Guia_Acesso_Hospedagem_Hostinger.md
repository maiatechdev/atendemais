# Guia — Liberar Acesso à Hospedagem (Hostinger)

**Sistema:** Atende+ (SEMDESC)
**Para:** Secretário responsável pela contratação da hospedagem
**De:** Equipe de desenvolvimento

---

## Por que preciso de acesso

O sistema Atende+ vai rodar numa **VPS (servidor)** contratada na Hostinger. Para colocar o
sistema no ar, atualizar o código e resolver qualquer problema no dia a dia, preciso de acesso a
três coisas dentro dessa hospedagem: o **painel de controle (hPanel)**, o **servidor via SSH** e o
**banco de dados**.

Não preciso — e não é recomendado — que você me passe a senha da sua conta Hostinger pessoal. A
Hostinger tem um jeito de me dar acesso apenas ao necessário, sem expor dados de cobrança ou outros
serviços que você tenha na conta.

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

## Passo 2 — Liberar acesso ao servidor (SSH)

O acesso do hPanel sozinho não é suficiente para subir o sistema — também preciso de acesso ao
servidor em si, chamado de **SSH**. O jeito mais seguro de fazer isso é por **chave**, não por
senha:

1. Vou te enviar, por e-mail, um arquivo de **chave pública** (um texto, não uma senha).
2. No hPanel, vá em **VPS → [sua VPS] → Configurações → Chaves SSH** (o caminho exato varia
   conforme o plano).
3. Adicione a chave que eu te enviei.

Isso me dá acesso ao servidor sem que você precise me contar nenhuma senha, e você pode revogar
meu acesso a qualquer momento removendo essa chave — sem precisar trocar senha de nada.

> Caso seu plano não tenha essa opção de chave, como alternativa você pode me passar o
> **usuário e senha de acesso SSH da VPS** diretamente (combinamos o canal seguro para isso).

---

## Passo 3 — Informações que preciso que você confirme comigo

Antes de eu começar a configurar, preciso saber:

- [ ] O plano contratado é **VPS** (servidor próprio) ou **hospedagem compartilhada**?
- [ ] Já existe um **domínio** (endereço, tipo `www.exemplo.com.br`) associado a essa hospedagem?
      Se sim, qual?
- [ ] O domínio foi comprado na própria Hostinger ou em outro lugar (Registro.br, etc.)?
- [ ] Você já criou algum **banco de dados MySQL/MariaDB** nessa hospedagem, ou isso ainda está
      pendente? (Se ainda não, eu mesmo crio depois de ter acesso ao painel.)

---

## O que eu vou fazer depois de ter acesso

Só para deixar transparente o que vai acontecer no servidor depois da liberação:

1. Instalar o que for necessário para rodar o sistema (Node.js, gerenciador de processos).
2. Criar o banco de dados e as tabelas do sistema.
3. Subir o código do Atende+ e deixá-lo rodando 24 horas.
4. Configurar o domínio para apontar para o sistema, com certificado de segurança (HTTPS)
   gratuito.
5. Testar tudo antes de avisar que está no ar.

---

## Segurança

- Nunca vou pedir a senha da sua conta Hostinger por telefone, WhatsApp ou e-mail — só o convite
  oficial pelo painel (Passo 1) ou a chave SSH (Passo 2).
- Assim que o acesso for liberado, o primeiro login do sistema (usuário administrador) terá a
  senha alterada imediatamente por segurança.
- Se em algum momento você quiser revogar meu acesso, basta remover meu usuário na tela de
  **Equipe** do hPanel e/ou remover a chave SSH — não afeta o funcionamento do sistema.

---

Qualquer dúvida em algum desses passos, me chame que eu explico por chamada de vídeo ou faço um
passo a passo com print de tela.
