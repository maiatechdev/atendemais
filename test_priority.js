import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Cores para o console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Aguardar conexão
socket.on('connect', async () => {
    log('green', '\n✅ Conectado ao servidor!\n');

    // Aguardar um pouco para garantir que o estado inicial foi recebido
    await sleep(500);

    log('cyan', '═══════════════════════════════════════════════════════════');
    log('cyan', '  TESTE DE LÓGICA DE PRIORIDADE - Atende+');
    log('cyan', '═══════════════════════════════════════════════════════════\n');

    // Executar testes
    await runTests();
});

socket.on('stateUpdated', (state) => {
    // Silencioso - não vamos logar todas as atualizações
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function gerarSenha(nome, tipo, prioridade) {
    return new Promise((resolve, reject) => {
        socket.emit('request_ticket', { nome, tipo, prioridade }, (response) => {
            if (response.success) {
                log('green', `✓ Senha gerada: ${response.data.numero} - ${nome} (${prioridade})`);
                resolve(response.data);
            } else {
                log('red', `✗ Erro ao gerar senha: ${response.error}`);
                reject(response.error);
            }
        });
    });
}

async function chamarSenha(guiche = 1, atendente = 'Teste') {
    return new Promise((resolve) => {
        socket.emit('call_ticket', { guiche, atendente }, () => {
            resolve();
        });

        // Aguardar atualização do estado
        const handler = (state) => {
            if (state.senhaAtual) {
                log('blue', `→ Chamada: ${state.senhaAtual.numero} - ${state.senhaAtual.nome}`);
                socket.off('stateUpdated', handler);
                resolve(state.senhaAtual);
            }
        };
        socket.on('stateUpdated', handler);
    });
}

async function finalizarSenha(senhaId) {
    socket.emit('update_ticket_status', { id: senhaId, status: 'concluida' });
    await sleep(300);
}

async function resetarFila() {
    return new Promise((resolve) => {
        socket.emit('admin_reset_queue', (response) => {
            if (response.success) {
                log('yellow', '\n🔄 Fila resetada\n');
                resolve();
            }
        });
    });
}

async function runTests() {
    try {
        // ═══════════════════════════════════════════════════════════
        // TESTE 1: Prioridade Básica
        // ═══════════════════════════════════════════════════════════
        log('cyan', '\n📋 TESTE 1: Prioridade Básica');
        log('cyan', '─────────────────────────────────────────────────────────');
        log('yellow', 'Objetivo: Verificar se senhas prioritárias são chamadas antes das normais\n');

        await resetarFila();

        const s1 = await gerarSenha('João Silva', 'Cadastro Novo', 'normal');
        await sleep(200);
        const s2 = await gerarSenha('Maria Santos', 'Atualização', 'normal');
        await sleep(200);
        const s3 = await gerarSenha('Pedro Oliveira', 'Cadastro Novo', 'prioritaria');
        await sleep(200);
        const s4 = await gerarSenha('Ana Costa', 'Atualização', 'normal');

        log('yellow', '\nChamando senhas...\n');
        await sleep(500);

        const chamada1 = await chamarSenha();
        await sleep(500);
        await finalizarSenha(chamada1.id);

        if (chamada1.numero === s3.numero) {
            log('green', '✅ TESTE 1 PASSOU: Senha prioritária foi chamada primeiro!\n');
        } else {
            log('red', `❌ TESTE 1 FALHOU: Esperado ${s3.numero}, recebido ${chamada1.numero}\n`);
        }

        await sleep(1000);

        // ═══════════════════════════════════════════════════════════
        // TESTE 2: Ordem FIFO (First In, First Out)
        // ═══════════════════════════════════════════════════════════
        log('cyan', '\n📋 TESTE 2: Ordem FIFO (First In, First Out)');
        log('cyan', '─────────────────────────────────────────────────────────');
        log('yellow', 'Objetivo: Verificar se senhas do mesmo tipo respeitam ordem de chegada\n');

        await resetarFila();

        const n1 = await gerarSenha('Cliente 1', 'Cadastro Novo', 'normal');
        await sleep(200);
        const n2 = await gerarSenha('Cliente 2', 'Cadastro Novo', 'normal');
        await sleep(200);
        const n3 = await gerarSenha('Cliente 3', 'Cadastro Novo', 'normal');

        log('yellow', '\nChamando senhas...\n');
        await sleep(500);

        const ordem = [];
        for (let i = 0; i < 3; i++) {
            const chamada = await chamarSenha();
            ordem.push(chamada.numero);
            await sleep(300);
            await finalizarSenha(chamada.id);
            await sleep(300);
        }

        const ordemEsperada = [n1.numero, n2.numero, n3.numero];
        const passou = JSON.stringify(ordem) === JSON.stringify(ordemEsperada);

        if (passou) {
            log('green', `✅ TESTE 2 PASSOU: Ordem correta ${ordem.join(' → ')}\n`);
        } else {
            log('red', `❌ TESTE 2 FALHOU: Esperado ${ordemEsperada.join(' → ')}, recebido ${ordem.join(' → ')}\n`);
        }

        await sleep(1000);

        // ═══════════════════════════════════════════════════════════
        // TESTE 3: Múltiplas Prioridades Intercaladas
        // ═══════════════════════════════════════════════════════════
        log('cyan', '\n📋 TESTE 3: Múltiplas Prioridades Intercaladas');
        log('cyan', '─────────────────────────────────────────────────────────');
        log('yellow', 'Objetivo: Testar cenário complexo com múltiplas prioridades\n');

        await resetarFila();

        const senhas = [];
        senhas.push(await gerarSenha('Normal 1', 'Cadastro Novo', 'normal'));
        await sleep(200);
        senhas.push(await gerarSenha('Prioritária 1', 'Cadastro Novo', 'prioritaria'));
        await sleep(200);
        senhas.push(await gerarSenha('Normal 2', 'Cadastro Novo', 'normal'));
        await sleep(200);
        senhas.push(await gerarSenha('Prioritária 2', 'Cadastro Novo', 'prioritaria'));
        await sleep(200);
        senhas.push(await gerarSenha('Normal 3', 'Cadastro Novo', 'normal'));
        await sleep(200);
        senhas.push(await gerarSenha('Prioritária 3', 'Cadastro Novo', 'prioritaria'));

        log('yellow', '\nChamando todas as senhas...\n');
        await sleep(500);

        const ordemChamada = [];
        for (let i = 0; i < 6; i++) {
            const chamada = await chamarSenha();
            ordemChamada.push(chamada.numero);
            await sleep(300);
            await finalizarSenha(chamada.id);
            await sleep(300);
        }

        // Ordem esperada: P1, P2, P3, N1, N2, N3
        const ordemEsperada3 = [
            senhas[1].numero, // P1
            senhas[3].numero, // P2
            senhas[5].numero, // P3
            senhas[0].numero, // N1
            senhas[2].numero, // N2
            senhas[4].numero  // N3
        ];

        const passou3 = JSON.stringify(ordemChamada) === JSON.stringify(ordemEsperada3);

        if (passou3) {
            log('green', `✅ TESTE 3 PASSOU: Ordem correta ${ordemChamada.join(' → ')}\n`);
        } else {
            log('red', `❌ TESTE 3 FALHOU:`);
            log('red', `   Esperado: ${ordemEsperada3.join(' → ')}`);
            log('red', `   Recebido: ${ordemChamada.join(' → ')}\n`);
        }

        await sleep(1000);

        // ═══════════════════════════════════════════════════════════
        // TESTE 4: Prioridade+ (Se implementado)
        // ═══════════════════════════════════════════════════════════
        log('cyan', '\n📋 TESTE 4: Prioridade+ (Teste de Implementação)');
        log('cyan', '─────────────────────────────────────────────────────────');
        log('yellow', 'Objetivo: Verificar se prioritaria+ tem precedência sobre prioritaria\n');

        await resetarFila();

        const t4s1 = await gerarSenha('Normal', 'Cadastro Novo', 'normal');
        await sleep(200);
        const t4s2 = await gerarSenha('Prioritária', 'Cadastro Novo', 'prioritaria');
        await sleep(200);
        const t4s3 = await gerarSenha('Prioritária+', 'Cadastro Novo', 'prioritaria+');

        log('yellow', '\nChamando senhas...\n');
        await sleep(500);

        const t4chamada = await chamarSenha();

        if (t4chamada.numero === t4s3.numero) {
            log('green', '✅ TESTE 4 PASSOU: Prioritária+ foi chamada primeiro!\n');
        } else if (t4chamada.numero === t4s2.numero) {
            log('yellow', '⚠️  TESTE 4 PARCIAL: Prioritária+ não está diferenciada de prioritária');
            log('yellow', '   (Ambas são tratadas da mesma forma atualmente)\n');
        } else {
            log('red', `❌ TESTE 4 FALHOU: Esperado ${t4s3.numero}, recebido ${t4chamada.numero}\n`);
        }

        // ═══════════════════════════════════════════════════════════
        // RESUMO
        // ═══════════════════════════════════════════════════════════
        log('cyan', '\n═══════════════════════════════════════════════════════════');
        log('cyan', '  TESTES CONCLUÍDOS');
        log('cyan', '═══════════════════════════════════════════════════════════\n');

        log('yellow', 'Para mais testes, acesse: http://localhost:3001');
        log('yellow', 'Credenciais: admin / admin\n');

        process.exit(0);

    } catch (error) {
        log('red', `\n❌ Erro durante os testes: ${error}\n`);
        process.exit(1);
    }
}

socket.on('connect_error', (error) => {
    log('red', `\n❌ Erro de conexão: ${error.message}`);
    log('yellow', 'Certifique-se de que o servidor está rodando em http://localhost:3001\n');
    process.exit(1);
});
