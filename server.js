import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// Helper to get full state from DB for broadcast
async function getFullState() {
    const senhas = await prisma.senha.findMany();
    const senhaAtual = await prisma.senha.findFirst({
        where: { status: { in: ['chamada', 'atendendo'] } },
        orderBy: { horaChamada: 'desc' }
    });

    // Ultimas senhas (apenas ativas: chamada ou atendendo)
    const ultimasSenhas = await prisma.senha.findMany({
        where: {
            horaChamada: { not: null },
            status: { notIn: ['concluida', 'cancelada'] }
        },
        orderBy: { horaChamada: 'desc' },
        take: 5
    });

    const configNormal = await prisma.config.findUnique({ where: { key: 'contadorNormal' } });
    const configPrioritaria = await prisma.config.findUnique({ where: { key: 'contadorPrioritaria' } });

    return {
        senhas,
        senhaAtual,
        ultimasSenhas,
        contadorNormal: configNormal ? parseInt(configNormal.value) : 1,
        contadorPrioritaria: configPrioritaria ? parseInt(configPrioritaria.value) : 1
    };
}

async function startServer() {
    // Inicializar contadores se não existirem
    try {
        const cN = await prisma.config.findUnique({ where: { key: 'contadorNormal' } });
        if (!cN) await prisma.config.create({ data: { key: 'contadorNormal', value: '1' } });

        const cP = await prisma.config.findUnique({ where: { key: 'contadorPrioritaria' } });
        if (!cP) await prisma.config.create({ data: { key: 'contadorPrioritaria', value: '1' } });

        // Inicializar Admin Padrão
        const adminExists = await prisma.usuario.findFirst({ where: { isAdmin: true } });
        if (!adminExists) {
            console.log('Criando usuário Admin padrão...');
            await prisma.usuario.create({
                data: {
                    nome: 'Administrador',
                    email: 'admin', // Login simples
                    senha: 'admin', // Senha simples
                    isAdmin: true,
                    funcao: 'Administrador'
                }
            });
        }

        // Inicializar Serviços Padrão
        const servicesCount = await prisma.servico.count();
        if (servicesCount === 0) {
            console.log('Inicializando serviços padrão...');
            const defaultServices = [
                'Cadastro Novo',
                'Atualização',
                'Informações',
                'Benefícios',
                'Documentação'
            ];
            for (const nome of defaultServices) {
                await prisma.servico.create({ data: { nome } });
            }
        }
    } catch (e) {
        console.error("Erro na inicialização do DB:", e);
    }

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
    });

    app.use(vite.middlewares);

    const onlineUsers = new Map(); // socketId -> userId
    const connectedUserIds = new Set();

    io.on('connection', async (socket) => {
        console.log('Cliente conectado:', socket.id);

        try {
            // 1. Send Initial State
            const initialState = await getFullState();
            socket.emit('stateUpdated', initialState);
        } catch (e) {
            console.error("Erro ao enviar estado inicial:", e);
        }

        // --- AUTH EVENTS ---
        socket.on('login', async (data, callback) => {
            try {
                const { email, password } = data;
                const user = await prisma.usuario.findFirst({
                    where: {
                        email: email,
                        senha: password // Em produção usar hash!
                    }
                });

                if (user) {
                    // Track user
                    onlineUsers.set(socket.id, user.id);
                    connectedUserIds.add(user.id);

                    // Broadcast user status update
                    const allUsers = await prisma.usuario.findMany();
                    const usersWithStatus = allUsers.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                    io.emit('usersUpdated', usersWithStatus);

                    if (callback) callback({ success: true, user: { id: user.id, nome: user.nome, email: user.email, isAdmin: user.isAdmin } });
                } else {
                    if (callback) callback({ success: false, error: 'Credenciais inválidas' });
                }
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 2. Handle 'request_ticket'
        socket.on('request_ticket', async (data, callback) => {
            console.log('Recebido request_ticket:', data);
            try {
                const { nome, tipo, prioridade } = data;

                const configKey = prioridade === 'prioritaria' ? 'contadorPrioritaria' : 'contadorNormal';
                const prefixo = prioridade === 'prioritaria' ? 'P' : 'N';

                const config = await prisma.config.findUnique({ where: { key: configKey } });
                const contador = config ? parseInt(config.value) : 1;
                const numero = `${prefixo}${String(contador).padStart(3, '0')}`;

                await prisma.config.update({
                    where: { key: configKey },
                    data: { value: String(contador + 1) }
                });

                const novaSenha = await prisma.senha.create({
                    data: {
                        numero,
                        nome,
                        tipo,
                        prioridade,
                        status: 'aguardando',
                        horaGeracao: new Date()
                    }
                });

                const newState = await getFullState();
                io.emit('stateUpdated', newState);
                console.log('Senha criada com sucesso:', numero);

                if (callback) callback({ success: true, data: novaSenha });
            } catch (err) {
                console.error('Erro em request_ticket:', err);
                if (callback) callback({ success: false, error: err.message });
            }
        });

        // 3. Handle 'call_ticket'
        socket.on('call_ticket', async (data) => {
            try {
                const { guiche, atendente, tiposPermitidos } = data;

                // Busca fila no DB
                const todasSenhas = await prisma.senha.findMany({
                    where: { status: 'aguardando' }
                });

                const fila = todasSenhas
                    .filter(s => {
                        if (tiposPermitidos && tiposPermitidos.length > 0) {
                            return tiposPermitidos.includes(s.tipo);
                        }
                        return true;
                    })
                    .sort((a, b) => {
                        if (a.prioridade === b.prioridade) {
                            return new Date(a.horaGeracao).getTime() - new Date(b.horaGeracao).getTime();
                        }
                        return a.prioridade === 'prioritaria' ? -1 : 1;
                    });

                if (fila.length === 0) return;

                const proximaSenha = fila[0];

                // Atualiza status no DB
                await prisma.senha.update({
                    where: { id: proximaSenha.id },
                    data: {
                        status: 'chamada',
                        guiche,
                        atendente,
                        horaChamada: new Date()
                    }
                });

                const newState = await getFullState();
                io.emit('stateUpdated', newState);

                // Timeout para 'atendendo'
                // Auto-timeout removed to allow manual start
                // setTimeout(async () => { ... }, 2000);
            } catch (e) {
                console.error("Erro em call_ticket:", e);
            }
        });

        // 4. Handle 'update_ticket_status'
        socket.on('update_ticket_status', async (data) => {
            try {
                const { id, status } = data;
                await prisma.senha.update({
                    where: { id },
                    data: {
                        status,
                        status,
                        horaFinalizacao: status === 'concluida' ? new Date() : undefined,
                        horaInicio: status === 'atendendo' ? new Date() : undefined
                    }
                });
                const newState = await getFullState();
                io.emit('stateUpdated', newState);
            } catch (e) {
                console.error("Erro update_ticket_status:", e);
            }
        });

        // 5. Handle 'repeat_ticket'
        socket.on('repeat_ticket', async () => {
            try {
                const current = await prisma.senha.findFirst({
                    where: { status: { in: ['chamada', 'atendendo'] } },
                    orderBy: { horaChamada: 'desc' }
                });

                if (current) {
                    await prisma.senha.update({
                        where: { id: current.id },
                        data: { horaChamada: new Date() }
                    });
                    const newState = await getFullState();
                    io.emit('stateUpdated', newState);
                }
            } catch (e) { console.error("Erro repeat_ticket:", e); }
        });

        // --- ADMIN EVENTS ---

        // 6. Reset Queue (Zerar Fila)
        socket.on('admin_reset_queue', async (callback) => {
            console.log('Admin: Resetting queue...');
            try {
                // Delete all tickets
                await prisma.senha.deleteMany({});

                // Reset counters
                await prisma.config.update({ where: { key: 'contadorNormal' }, data: { value: '1' } });
                await prisma.config.update({ where: { key: 'contadorPrioritaria' }, data: { value: '1' } });

                const newState = await getFullState();
                io.emit('stateUpdated', newState);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro reset_queue:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 7. Get Users
        socket.on('admin_get_users', async (callback) => {
            try {
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                if (callback) callback({ success: true, data: usersWithStatus });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 8. Create User
        socket.on('admin_create_user', async (data, callback) => {
            try {
                const { nome, email, senha, funcao, guiche, tiposAtendimento, isAdmin } = data;
                await prisma.usuario.create({
                    data: {
                        nome,
                        email,
                        senha: senha || '123456', // Default password if missing
                        funcao,
                        isAdmin: !!isAdmin, // Force boolean
                        guiche: parseInt(guiche) || null,
                        tiposAtendimento: JSON.stringify(tiposAtendimento || [])
                    }
                });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                io.emit('usersUpdated', users);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro create_user:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 9. Delete User
        socket.on('admin_delete_user', async (id, callback) => {
            try {
                const userToDelete = await prisma.usuario.findUnique({ where: { id } });
                if (userToDelete && userToDelete.email === 'lucas.andr97@gmail.com') {
                    if (callback) callback({ success: false, error: 'Este usuário é protegido e não pode ser excluído.' });
                    return;
                }

                await prisma.usuario.delete({ where: { id } });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                io.emit('usersUpdated', users);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro delete_user:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 10. Service Management
        socket.on('admin_get_services', async (callback) => {
            try {
                const services = await prisma.servico.findMany();
                if (callback) callback({ success: true, data: services });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        socket.on('admin_create_service', async (nome, callback) => {
            try {
                const newService = await prisma.servico.create({ data: { nome } });
                const services = await prisma.servico.findMany();
                io.emit('servicesUpdated', services);
                if (callback) callback({ success: true, data: newService });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        socket.on('admin_delete_service', async (id, callback) => {
            try {
                await prisma.servico.delete({ where: { id } });
                const services = await prisma.servico.findMany();
                io.emit('servicesUpdated', services);
                if (callback) callback({ success: true });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        socket.on('admin_toggle_service', async (id, callback) => {
            try {
                const s = await prisma.servico.findUnique({ where: { id } });
                if (s) {
                    await prisma.servico.update({
                        where: { id },
                        data: { ativo: !s.ativo }
                    });
                    const services = await prisma.servico.findMany();
                    io.emit('servicesUpdated', services);
                    if (callback) callback({ success: true });
                }
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 11. Attendant Session Update (Self-Config)
        socket.on('attendant_update_session', async (data, callback) => {
            try {
                const { userId, guiche, tiposAtendimento } = data;

                await prisma.usuario.update({
                    where: { id: userId },
                    data: {
                        guiche: parseInt(guiche),
                        tiposAtendimento: JSON.stringify(tiposAtendimento || [])
                    }
                });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                io.emit('usersUpdated', usersWithStatus);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro attendant_update_session:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        socket.on('disconnect', async () => {
            if (onlineUsers.has(socket.id)) {
                const userId = onlineUsers.get(socket.id);
                onlineUsers.delete(socket.id);

                // Check if user still has other connections
                const activeSockets = Array.from(onlineUsers.values());
                if (!activeSockets.includes(userId)) {
                    connectedUserIds.delete(userId);
                }

                // Broadcast update
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                io.emit('usersUpdated', usersWithStatus);
            }
        });
    });

    const PORT = 3001;
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

startServer();
