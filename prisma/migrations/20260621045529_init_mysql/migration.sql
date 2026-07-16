-- CreateTable
CREATE TABLE `Senha` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `prioridade` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `guiche` INTEGER NULL,
    `atendente` VARCHAR(191) NULL,
    `horaGeracao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `horaChamada` DATETIME(3) NULL,
    `horaInicio` DATETIME(3) NULL,
    `horaFinalizacao` DATETIME(3) NULL,
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `tipoGuiche` VARCHAR(191) NULL DEFAULT 'Guichê',
    `cpf` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `funcao` VARCHAR(191) NOT NULL,
    `guiche` INTEGER NULL,
    `tipoGuiche` VARCHAR(191) NULL DEFAULT 'Guichê',
    `tiposAtendimento` TEXT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Config` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servico` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Servico_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agendamento` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `dataAgendada` VARCHAR(191) NOT NULL,
    `horaAgendada` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `tipo` VARCHAR(191) NOT NULL,
    `prioridade` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mensagem` (
    `id` VARCHAR(191) NOT NULL,
    `autorId` VARCHAR(191) NOT NULL,
    `autorNome` VARCHAR(191) NOT NULL,
    `destinatarioId` VARCHAR(191) NULL,
    `destinatarioNome` VARCHAR(191) NULL,
    `texto` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

