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
const bcrypt = require('bcryptjs');

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
            status: { notIn: ['cancelada'] }
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

async function checkDailyReset() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const configDate = await prisma.config.findUnique({ where: { key: 'lastResetDate' } });

        if (!configDate || configDate.value !== today) {
            console.log(`[Daily Reset] Detectada mudança de dia: ${configDate?.value} -> ${today}`);

            // 1. Reset Counters
            await prisma.config.upsert({
                where: { key: 'contadorNormal' },
                update: { value: '1' },
                create: { key: 'contadorNormal', value: '1' }
            });

            await prisma.config.upsert({
                where: { key: 'contadorPrioritaria' },
                update: { value: '1' },
                create: { key: 'contadorPrioritaria', value: '1' }
            });

            // 2. Clear Active Queue (preserve history, just cancel pending)
            const { count } = await prisma.senha.updateMany({
                where: {
                    status: { in: ['aguardando', 'chamada', 'atendendo'] }
                },
                data: {
                    status: 'cancelada',
                    horaFinalizacao: new Date()
                }
            });

            if (count > 0) {
                console.log(`[Daily Reset] ${count} senhas pendentes foram canceladas.`);
            }

            // 3. Update Last Reset Date
            await prisma.config.upsert({
                where: { key: 'lastResetDate' },
                update: { value: today },
                create: { key: 'lastResetDate', value: today }
            });

            console.log('[Daily Reset] Contadores reiniciados para 001.');
            return true; // Reset happened
        }
        return false; // No reset needed
    } catch (e) {
        console.error("Erro no Daily Reset:", e);
        return false;
    }
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
        // Inicializar Serviços Padrão - REMOVIDO A PEDIDO DO USUÁRIO
        // O sistema agora permite ter 0 serviços sem recriar os padrões.
    } catch (e) {
        console.error("Erro na inicialização do DB:", e);
    }

    // Daily Reset Check
    await checkDailyReset();

    // Check every hour
    setInterval(() => {
        checkDailyReset();
    }, 60 * 60 * 1000);

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        console.log('Ambiente: PRODUÇÃO (Servindo arquivos estáticos)');
        const distPath = path.resolve(__dirname, 'dist');

        // Serve static files
        app.use(express.static(distPath));

        // SPA Fallback
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    } else {
        console.log('Ambiente: DESENVOLVIMENTO (Usando Vite Middleware)');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }

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
        // 1. Handle 'login'
        socket.on('login', async (data, callback) => {
            const { email, password } = data;
            try {
                // Find by email only to check password manually
                const user = await prisma.usuario.findUnique({ where: { email } });

                if (user) {
                    let isValid = false;

                    // 1. Check if it's a legacy plain-text password (temporary migration)
                    if (user.senha === password) {
                        // It's a match! Auto-migrate to hash
                        console.log(`[Security] Migrating legacy password for user ${user.email}...`);
                        const salt = await bcrypt.genSalt(10);
                        const hash = await bcrypt.hash(password, salt);

                        await prisma.usuario.update({
                            where: { id: user.id },
                            data: { senha: hash }
                        });
                        isValid = true;
                    } else {
                        // 2. Check bcrypt hash
                        isValid = await bcrypt.compare(password, user.senha || '');
                    }

                    if (isValid) {
                        // Track user
                        onlineUsers.set(socket.id, user.id);
                        connectedUserIds.add(user.id);

                        // Broadcast user status update
                        const allUsers = await prisma.usuario.findMany();
                        const usersWithStatus = allUsers.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                        io.emit('usersUpdated', usersWithStatus);

                        if (callback) callback({
                            success: true,
                            user: {
                                id: user.id,
                                nome: user.nome,
                                email: user.email,
                                isAdmin: user.isAdmin,
                                funcao: user.funcao
                            }
                        });
                    } else {
                        if (callback) callback({ success: false, error: 'Credenciais inválidas' });
                    }
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

                const configKey = (prioridade === 'prioritaria' || prioridade === 'prioritaria+') ? 'contadorPrioritaria' : 'contadorNormal';
                const prefixo = prioridade === 'prioritaria+' ? 'P+' :
                    prioridade === 'prioritaria' ? 'P' : 'N';

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

        // 3. Handle 'call_ticket' (Chamar Senha) - ATOMIC VERSION
        socket.on('call_ticket', async (data) => {
            try {
                const { guiche, atendente, tiposPermitidos, tipoGuiche, senhaId } = data;
                console.log(`[Call Ticket] Guichê ${guiche}, Tipo: ${tipoGuiche || 'Guichê'}, Atendente: ${atendente}, Senha Escolhida: ${senhaId || 'Nenhuma'}`);

                let ticketChamado = null;

                // Caso 1: Foi solicitada uma senha específica
                if (senhaId) {
                    const result = await prisma.senha.updateMany({
                        where: {
                            id: senhaId,
                            status: 'aguardando'
                        },
                        data: {
                            status: 'chamada',
                            guiche,
                            tipoGuiche: tipoGuiche || 'Guichê',
                            atendente,
                            horaChamada: new Date()
                        }
                    });

                    if (result.count > 0) {
                        ticketChamado = await prisma.senha.findUnique({ where: { id: senhaId } });
                    }
                }

                // Caso 2: Chamar próximo automático (Fallback se senhaId não informado ou já pega)
                if (!ticketChamado) {
                    // Construir cláusula where
                    let whereClause = {
                        status: 'aguardando'
                    };

                    // Se o atendente tem tipos permitidos, filtrar por eles
                    if (tiposPermitidos && tiposPermitidos.length > 0) {
                        whereClause.tipo = { in: tiposPermitidos };
                    };

                    // Busca candidatos para ordenar
                    const candidatos = await prisma.senha.findMany({
                        where: whereClause
                    });

                    // Helper function to assign numeric priority values
                    const prioridadeValor = (p) => {
                        if (p === 'prioritaria+') return 3;
                        if (p === 'prioritaria') return 2;
                        return 1; // normal
                    };

                    const filaOrdenada = candidatos.sort((a, b) => {
                        const prioA = prioridadeValor(a.prioridade);
                        const prioB = prioridadeValor(b.prioridade);

                        if (prioA !== prioB) {
                            return prioB - prioA; // Maior prioridade primeiro
                        }
                        return new Date(a.horaGeracao).getTime() - new Date(b.horaGeracao).getTime();
                    });

                    for (const candidato of filaOrdenada) {
                        const result = await prisma.senha.updateMany({
                            where: {
                                id: candidato.id,
                                status: 'aguardando'
                            },
                            data: {
                                status: 'chamada',
                                guiche,
                                tipoGuiche: tipoGuiche || 'Guichê',
                                atendente,
                                horaChamada: new Date()
                            }
                        });

                        if (result.count > 0) {
                            ticketChamado = await prisma.senha.findUnique({ where: { id: candidato.id } });
                            break;
                        }
                    }
                }

                if (ticketChamado) {
                    const newState = await getFullState();
                    io.emit('stateUpdated', newState);
                    console.log(`Senha ${ticketChamado.numero} chamada no ${tipoGuiche || 'Guichê'} ${guiche} (Atômico)`);
                }
            } catch (e) {
                console.error("Erro em call_ticket (Pick-Ticket):", e);
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

        // 5. Handle 'no_show_ticket' (Não apareceu)
        socket.on('no_show_ticket', async (data) => {
            try {
                const { id } = data;
                const ticket = await prisma.senha.findUnique({ where: { id } });

                if (ticket) {
                    const novasTentativas = ticket.tentativas + 1;
                    const maxTentativas = 3;

                    if (novasTentativas >= maxTentativas) {
                        // Max attempts reached -> Cancel
                        await prisma.senha.update({
                            where: { id },
                            data: {
                                status: 'cancelada',
                                tentativas: novasTentativas,
                                horaFinalizacao: new Date()
                            }
                        });
                        console.log(`[No Show] Senha ${ticket.numero} cancelada após ${novasTentativas} tentativas.`);
                    } else {
                        // Back to queue
                        await prisma.senha.update({
                            where: { id },
                            data: {
                                status: 'aguardando', // Return to queue
                                tentativas: novasTentativas,
                                horaChamada: null, // Reset call time so it sorts correctly by generation time (or keep it?) 
                                // Let's keep generation time as sort key, so it goes back to its place in line.
                                // We might want to clear atendente/guiche to allow others to pick it up?
                                atendente: null,
                                guiche: null
                            }
                        });
                        console.log(`[No Show] Senha ${ticket.numero} devolvida à fila. Tentativa ${novasTentativas}/${maxTentativas}.`);
                    }

                    const newState = await getFullState();
                    io.emit('stateUpdated', newState);
                }
            } catch (e) {
                console.error("Erro no_show_ticket:", e);
            }
        });

        // 6. Handle 'repeat_ticket'
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

                const plainPassword = senha || '123456';
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(plainPassword, salt);

                await prisma.usuario.create({
                    data: {
                        nome,
                        email,
                        senha: hashedPassword, // Store hash
                        funcao,
                        isAdmin: funcao === 'Administrador', // Enforce single admin type logic
                        guiche: parseInt(guiche) || null,
                        tiposAtendimento: JSON.stringify(tiposAtendimento || [])
                    }
                });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                io.emit('usersUpdated', usersWithStatus);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro create_user:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 9. Update User
        socket.on('admin_update_user', async (data, callback) => {
            try {
                const { id, nome, email, senha, funcao, guiche, tiposAtendimento } = data;

                const updateData = {
                    nome,
                    email,
                    funcao,
                    isAdmin: funcao === 'Administrador',
                    guiche: parseInt(guiche) || null,
                    tiposAtendimento: JSON.stringify(tiposAtendimento || [])
                };

                // Only update password if provided
                if (senha && senha.trim() !== '') {
                    const salt = await bcrypt.genSalt(10);
                    updateData.senha = await bcrypt.hash(senha, salt);
                }

                await prisma.usuario.update({
                    where: { id },
                    data: updateData
                });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                io.emit('usersUpdated', usersWithStatus);

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro update_user:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 10. Delete User
        socket.on('admin_delete_user', async (id, callback) => {
            try {
                const userToDelete = await prisma.usuario.findUnique({ where: { id } });
                if (userToDelete && userToDelete.email === 'maiatechdev@gmail.com') {
                    if (callback) callback({ success: false, error: 'Este usuário é protegido e não pode ser excluído.' });
                    return;
                }

                await prisma.usuario.delete({ where: { id } });

                // Broadcast updated user list
                const users = await prisma.usuario.findMany();
                const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                io.emit('usersUpdated', usersWithStatus);

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
                const { userId, guiche, tipoGuiche, tiposAtendimento } = data;

                await prisma.usuario.update({
                    where: { id: userId },
                    data: {
                        guiche: parseInt(guiche),
                        tipoGuiche: tipoGuiche || 'Guichê', // Save tipoGuiche
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


        // 12. Change Password (Self-Service)
        socket.on('change_password', async (data, callback) => {
            const { userId, oldPassword, newPassword } = data;
            try {
                const user = await prisma.usuario.findUnique({ where: { id: userId } });
                if (!user) {
                    if (callback) callback({ success: false, error: 'Usuário não encontrado.' });
                    return;
                }

                // Verify old password
                let isValid = false;
                if (user.senha === oldPassword) {
                    isValid = true; // Legacy match
                } else {
                    isValid = await bcrypt.compare(oldPassword, user.senha || '');
                }

                if (!isValid) {
                    if (callback) callback({ success: false, error: 'Senha atual incorreta.' });
                    return;
                }

                // Update to new password
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(newPassword, salt);

                await prisma.usuario.update({
                    where: { id: userId },
                    data: { senha: hash }
                });

                if (callback) callback({ success: true });
            } catch (e) {
                console.error("Erro change_password:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });
        socket.on('logout', () => {
            if (onlineUsers.has(socket.id)) {
                const userId = onlineUsers.get(socket.id);
                onlineUsers.delete(socket.id);

                const activeSockets = Array.from(onlineUsers.values());
                if (!activeSockets.includes(userId)) {
                    connectedUserIds.delete(userId);
                }

                // Broadcast update
                prisma.usuario.findMany().then(users => {
                    const usersWithStatus = users.map(u => ({ ...u, online: connectedUserIds.has(u.id) }));
                    io.emit('usersUpdated', usersWithStatus);
                });
            }
        });

        // --- APPOINTMENT EVENTS ---

        // 13. Schedule Appointment
        socket.on('schedule_appointment', async (data, callback) => {
            console.log('[DEBUG] Recebido schedule_appointment:', JSON.stringify(data));
            try {
                const { nome, tipo, prioridade, cpf, telefone, bairro, dataAgendada, horaAgendada, observacoes } = data;

                if (!nome || !dataAgendada || !tipo) {
                    console.error('[DEBUG] Dados inválidos para agendamento:', data);
                    if (callback) callback({ success: false, error: 'Dados incompletos.' });
                    return;
                }

                console.log('[DEBUG] Tentando criar no Prisma...');
                const novoAgendamento = await prisma.agendamento.create({
                    data: {
                        nome,
                        tipo,
                        prioridade: prioridade || 'normal',
                        cpf,
                        telefone,
                        bairro,
                        dataAgendada,
                        horaAgendada,
                        observacoes,
                        status: 'pendente'
                    }
                });
                console.log('[DEBUG] Agendamento criado:', novoAgendamento.id);

                // Broadcast update
                const appointments = await prisma.agendamento.findMany({
                    where: { dataAgendada: dataAgendada },
                    orderBy: { horaAgendada: 'asc' }
                });
                console.log(`[DEBUG] Enviando ${appointments.length} agendamentos para ${dataAgendada}`);
                io.emit('appointmentsUpdated', { date: dataAgendada, data: appointments });

                if (callback) callback({ success: true, data: novoAgendamento });
            } catch (e) {
                console.error("[DEBUG] Erro CRÍTICO schedule_appointment:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 14. Get Appointments
        socket.on('get_appointments', async (date, callback) => {
            console.log('[DEBUG] get_appointments solicitado para:', date);
            try {
                let where = {};
                if (date !== 'todos') {
                    where = { dataAgendada: date };
                }

                const appointments = await prisma.agendamento.findMany({
                    where,
                    orderBy: { horaAgendada: 'asc' }
                });
                console.log(`[DEBUG] Encontrados ${appointments.length} agendamentos.`);

                if (callback) callback({ success: true, data: appointments });
            } catch (e) {
                console.error("[DEBUG] Erro get_appointments:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // 15. Confirm Appointment (Generate Ticket)
        socket.on('confirm_appointment', async (id, callback) => {
            try {
                const agendamento = await prisma.agendamento.findUnique({ where: { id } });
                if (!agendamento) {
                    if (callback) callback({ success: false, error: 'Agendamento não encontrado.' });
                    return;
                }

                // Generate Ticket
                const configKey = (agendamento.prioridade === 'prioritaria' || agendamento.prioridade === 'prioritaria+') ? 'contadorPrioritaria' : 'contadorNormal';
                const prefixo = agendamento.prioridade === 'prioritaria+' ? 'P+' :
                    agendamento.prioridade === 'prioritaria' ? 'P' : 'N';

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
                        nome: agendamento.nome,
                        tipo: agendamento.tipo,
                        prioridade: agendamento.prioridade,
                        cpf: agendamento.cpf,
                        telefone: agendamento.telefone,
                        bairro: agendamento.bairro,
                        status: 'aguardando',
                        horaGeracao: new Date()
                    }
                });

                // Update Appointment
                await prisma.agendamento.update({
                    where: { id },
                    data: { status: 'confirmado' }
                });

                // Global Updates
                const state = await getFullState();
                io.emit('stateUpdated', state);

                const appointments = await prisma.agendamento.findMany({
                    where: { dataAgendada: agendamento.dataAgendada },
                    orderBy: { horaAgendada: 'asc' }
                });
                io.emit('appointmentsUpdated', { date: agendamento.dataAgendada, data: appointments });

                console.log(`Agendamento confirmado: ${agendamento.nome} -> Senha ${numero}`);
                if (callback) callback({ success: true, ticket: novaSenha });

            } catch (e) {
                console.error("Erro confirm_appointment:", e);
                if (callback) callback({ success: false, error: e.message });
            }
        });


        socket.on('cancel_appointment', async (id, callback) => {
            try {
                const agendamento = await prisma.agendamento.update({
                    where: { id },
                    data: { status: 'cancelado' }
                });

                const appointments = await prisma.agendamento.findMany({
                    where: { dataAgendada: agendamento.dataAgendada },
                    orderBy: { horaAgendada: 'asc' }
                });
                io.emit('appointmentsUpdated', { date: agendamento.dataAgendada, data: appointments });

                if (callback) callback({ success: true });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });


        socket.on('get_beneficiary_history', async (cpf, callback) => {
            try {
                const senhas = await prisma.senha.findMany({
                    where: { cpf: { contains: cpf } },
                    orderBy: { horaGeracao: 'desc' }
                });
                const agendamentos = await prisma.agendamento.findMany({
                    where: { cpf: { contains: cpf } },
                    orderBy: { dataAgendada: 'desc' }
                });

                if (callback) callback({ success: true, data: { senhas, agendamentos } });
            } catch (e) {
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // --- CHAT EVENTS ---

        // chat_get_history: Return last 100 relevant messages
        socket.on('chat_get_history', async (data, callback) => {
            try {
                const { usuarioId } = data || {};
                const mensagens = await prisma.mensagem.findMany({
                    where: {
                        OR: [
                            { destinatarioId: null }, // Geral
                            { autorId: usuarioId },    // Enviadas pelo usuário
                            { destinatarioId: usuarioId } // Recebidas pelo usuário
                        ]
                    },
                    orderBy: { criadoEm: 'asc' },
                    take: 100
                });
                if (callback) callback({ success: true, data: mensagens });
            } catch (e) {
                console.error('[Chat] Erro ao buscar histórico:', e);
                if (callback) callback({ success: false, error: e.message });
            }
        });

        // chat_send_message: Save message and broadcast or targeted emit
        socket.on('chat_send_message', async (data, callback) => {
            try {
                const { autorId, autorNome, texto, destinatarioId, destinatarioNome } = data;
                if (!texto || !texto.trim()) {
                    if (callback) callback({ success: false, error: 'Mensagem vazia.' });
                    return;
                }

                const novaMensagem = await prisma.mensagem.create({
                    data: {
                        autorId,
                        autorNome,
                        texto: texto.trim(),
                        destinatarioId: destinatarioId || null,
                        destinatarioNome: destinatarioNome || null
                    }
                });

                if (destinatarioId) {
                    // Mensagem Privada: Emitir apenas para o autor e o destinatário
                    // Precisamos encontrar os sockets do destinatário
                    const allSockets = Array.from(onlineUsers.entries());
                    const recipientSockets = allSockets.filter(([sid, uid]) => uid === destinatarioId).map(([sid, uid]) => sid);
                    const senderSockets = allSockets.filter(([sid, uid]) => uid === autorId).map(([sid, uid]) => sid);

                    const targets = [...new Set([...recipientSockets, ...senderSockets])];
                    targets.forEach(sid => {
                        io.to(sid).emit('chat_new_message', novaMensagem);
                    });
                } else {
                    // Mensagem Geral: Broadcast para todos
                    io.emit('chat_new_message', novaMensagem);
                }

                if (callback) callback({ success: true, data: novaMensagem });
            } catch (e) {
                console.error('[Chat] Erro ao enviar mensagem:', e);
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
