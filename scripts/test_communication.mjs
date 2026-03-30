/**
 * Teste de Comunicacao entre Paineis - AtendeMais
 * Simula 3 clientes simultaneos via Socket.io
 */

import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_URL = 'http://localhost:3001';
const TIMEOUT = 10000;
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const lines = [];
function log(msg) { lines.push(msg); console.log(msg); }
function ok(msg) { log(`  [PASS] ${msg}`); }
function fail(msg) { log(`  [FAIL] ${msg}`); }
function info(msg) { log(`  [INFO] ${msg}`); }
function header(msg) { log(`\n=== ${msg} ===\n`); }

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) { ok(message); testsPassed++; }
  else { fail(message); testsFailed++; }
}

async function connectSocket(name) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    const timer = setTimeout(() => reject(new Error(`Timeout connecting ${name}`)), TIMEOUT);
    socket.on('connect', () => { clearTimeout(timer); info(`[${name}] Connected (ID: ${socket.id})`); resolve(socket); });
    socket.on('connect_error', (err) => { clearTimeout(timer); reject(new Error(`Connection error [${name}]: ${err.message}`)); });
  });
}

async function runTests() {
  log('========================================');
  log('  TESTE DE COMUNICACAO ENTRE PAINEIS');
  log('========================================');
  log(`  Servidor: ${SERVER_URL}`);
  log(`  Horario: ${new Date().toLocaleTimeString('pt-BR')}`);

  let painelGerador, painelAtendente, painelPublico;

  try {
    // TESTE 1
    header('TESTE 1: Conexao dos Paineis');
    painelGerador = await connectSocket('Painel Gerador');
    assert(painelGerador.connected, 'Painel Gerador conectado ao servidor');
    painelAtendente = await connectSocket('Painel Atendente');
    assert(painelAtendente.connected, 'Painel Atendente conectado ao servidor');
    painelPublico = await connectSocket('Painel Publico');
    assert(painelPublico.connected, 'Painel Publico conectado ao servidor');
    await delay(1000);

    // TESTE 2
    header('TESTE 2: Recebimento de Estado Inicial');
    const initialState = await new Promise((resolve) => {
      const s = io(SERVER_URL, { transports: ['websocket'] });
      s.on('stateUpdated', (state) => { s.disconnect(); resolve(state); });
      setTimeout(() => { s.disconnect(); resolve(null); }, 5000);
    });
    assert(initialState !== null, 'Estado inicial recebido ao conectar');
    if (initialState) {
      assert(Array.isArray(initialState.senhas), 'Estado contem array de senhas');
      assert(initialState.contadorNormal !== undefined, `Contador Normal presente: ${initialState.contadorNormal}`);
      assert(initialState.contadorPrioritaria !== undefined, `Contador Prioritaria presente: ${initialState.contadorPrioritaria}`);
      info(`Estado inicial: ${initialState.senhas.length} senhas, N=${initialState.contadorNormal}, P=${initialState.contadorPrioritaria}`);
    }

    // TESTE 3
    header('TESTE 3: Gerar Senha Normal (Painel Gerador)');
    let publicStateUpdateReceived = false;
    let publicStateData = null;
    const publicUpdatePromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { publicStateUpdateReceived = true; publicStateData = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    let atendenteStateReceived = false;
    let atendenteStateData = null;
    const atendenteUpdatePromise = new Promise((resolve) => {
      painelAtendente.once('stateUpdated', (state) => { atendenteStateReceived = true; atendenteStateData = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });

    const ticketNormal = await new Promise((resolve, reject) => {
      painelGerador.emit('request_ticket', {
        nome: 'Joao Silva Teste', tipo: 'Cadastro Novo', prioridade: 'normal',
        cpf: '123.456.789-00', telefone: '(11) 99999-0000', bairro: 'Centro'
      }, (response) => {
        if (response.success) resolve(response.data);
        else reject(new Error(response.error));
      });
      setTimeout(() => reject(new Error('Timeout ao gerar senha normal')), TIMEOUT);
    });

    assert(ticketNormal !== null, `Senha Normal gerada: ${ticketNormal.numero}`);
    assert(ticketNormal.numero.startsWith('N'), `Numero comeca com "N": ${ticketNormal.numero}`);
    assert(ticketNormal.status === 'aguardando', `Status inicial e "aguardando": ${ticketNormal.status}`);
    assert(ticketNormal.nome === 'Joao Silva Teste', `Nome correto: ${ticketNormal.nome}`);
    assert(ticketNormal.tipo === 'Cadastro Novo', `Tipo correto: ${ticketNormal.tipo}`);
    assert(ticketNormal.cpf === '123.456.789-00', `CPF correto: ${ticketNormal.cpf}`);

    await Promise.all([publicUpdatePromise, atendenteUpdatePromise]);
    assert(publicStateUpdateReceived, 'Painel Publico recebeu stateUpdated apos gerar senha');
    assert(atendenteStateReceived, 'Painel Atendente recebeu stateUpdated apos gerar senha');

    if (publicStateData) {
      const foundInPublic = publicStateData.senhas.find(s => s.id === ticketNormal.id);
      assert(!!foundInPublic, `Senha ${ticketNormal.numero} presente no estado do Painel Publico`);
    }
    if (atendenteStateData) {
      const foundInAtendente = atendenteStateData.senhas.find(s => s.id === ticketNormal.id);
      assert(!!foundInAtendente, `Senha ${ticketNormal.numero} presente no estado do Painel Atendente`);
    }

    // TESTE 4
    header('TESTE 4: Gerar Senha Prioritaria');
    const ticketPrioritario = await new Promise((resolve, reject) => {
      painelGerador.emit('request_ticket', {
        nome: 'Maria Souza Teste', tipo: 'Atualizacao', prioridade: 'prioritaria',
        cpf: '987.654.321-00', telefone: '(11) 88888-0000', bairro: 'Jardins'
      }, (response) => {
        if (response.success) resolve(response.data);
        else reject(new Error(response.error));
      });
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT);
    });
    assert(ticketPrioritario !== null, `Senha Prioritaria gerada: ${ticketPrioritario.numero}`);
    assert(ticketPrioritario.numero.startsWith('P'), `Numero comeca com "P": ${ticketPrioritario.numero}`);
    assert(ticketPrioritario.prioridade === 'prioritaria', `Prioridade correta: ${ticketPrioritario.prioridade}`);
    await delay(500);

    // TESTE 5
    header('TESTE 5: Chamar Senha (Painel Atendente)');
    let publicCallUpdate = null;
    const publicCallPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { publicCallUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('call_ticket', {
      guiche: 1, tipoGuiche: 'Guiche', atendente: 'Atendente Teste',
      tiposPermitidos: ['Cadastro Novo', 'Atualizacao']
    });
    await publicCallPromise;
    assert(publicCallUpdate !== null, 'Painel Publico recebeu atualizacao apos chamar senha');
    if (publicCallUpdate) {
      const { senhaAtual } = publicCallUpdate;
      assert(senhaAtual !== null, 'senhaAtual esta definida no estado');
      if (senhaAtual) {
        assert(senhaAtual.status === 'chamada', `Status da senha chamada: "${senhaAtual.status}"`);
        assert(senhaAtual.guiche === 1, `Guiche correto: ${senhaAtual.guiche}`);
        assert(senhaAtual.atendente === 'Atendente Teste', `Atendente correto: ${senhaAtual.atendente}`);
        assert(senhaAtual.numero === ticketPrioritario.numero, `Senha prioritaria chamada primeiro: ${senhaAtual.numero} (esperado ${ticketPrioritario.numero})`);
        info(`Senha chamada no Painel Publico: ${senhaAtual.numero} -> Guiche ${senhaAtual.guiche}`);
        const { ultimasSenhas } = publicCallUpdate;
        assert(Array.isArray(ultimasSenhas), 'ultimasSenhas e um array');
        if (ultimasSenhas && ultimasSenhas.length > 0) {
          assert(ultimasSenhas[0].numero === senhaAtual.numero, `Ultima senha chamada no historico: ${ultimasSenhas[0].numero}`);
        }
      }
    }

    // TESTE 6
    header('TESTE 6: Iniciar Atendimento');
    let attendingUpdate = null;
    const attendingPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { attendingUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('update_ticket_status', { id: ticketPrioritario.id, status: 'atendendo' });
    await attendingPromise;
    assert(attendingUpdate !== null, 'Painel Publico recebeu atualizacao de atendimento');
    if (attendingUpdate && attendingUpdate.senhaAtual) {
      assert(attendingUpdate.senhaAtual.status === 'atendendo', `Status mudou para "atendendo": ${attendingUpdate.senhaAtual.status}`);
    }

    // TESTE 7
    header('TESTE 7: Finalizar e Chamar Proxima Senha');
    let finishUpdate = null;
    const finishPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { finishUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('update_ticket_status', { id: ticketPrioritario.id, status: 'concluida' });
    await finishPromise;
    assert(finishUpdate !== null, 'Painel Publico recebeu atualizacao de conclusao');

    let nextCallUpdate = null;
    const nextCallPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { nextCallUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('call_ticket', {
      guiche: 2, tipoGuiche: 'Sala', atendente: 'Atendente 2',
      tiposPermitidos: ['Cadastro Novo', 'Atualizacao']
    });
    await nextCallPromise;
    if (nextCallUpdate && nextCallUpdate.senhaAtual) {
      assert(nextCallUpdate.senhaAtual.numero === ticketNormal.numero, `Proxima senha chamada e a normal: ${nextCallUpdate.senhaAtual.numero} (esperado: ${ticketNormal.numero})`);
      assert(nextCallUpdate.senhaAtual.guiche === 2, `Guiche da segunda chamada: ${nextCallUpdate.senhaAtual.guiche}`);
      assert(nextCallUpdate.senhaAtual.tipoGuiche === 'Sala', `Tipo de guiche "Sala": ${nextCallUpdate.senhaAtual.tipoGuiche}`);
    }

    // TESTE 8
    header('TESTE 8: Gerar e Chamar Senha Especifica por ID');
    const ticket3 = await new Promise((resolve, reject) => {
      painelGerador.emit('request_ticket', {
        nome: 'Carlos Santos Teste', tipo: 'Cadastro Novo', prioridade: 'normal', cpf: '111.222.333-44',
      }, (response) => {
        if (response.success) resolve(response.data);
        else reject(new Error(response.error));
      });
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT);
    });
    await delay(500);
    assert(ticket3 !== null, `Terceira senha gerada: ${ticket3.numero}`);

    painelAtendente.emit('update_ticket_status', { id: ticketNormal.id, status: 'concluida' });
    await delay(500);

    let specificCallUpdate = null;
    const specificCallPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { specificCallUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('call_ticket', { guiche: 3, tipoGuiche: 'Guiche', atendente: 'Atendente 3', senhaId: ticket3.id });
    await specificCallPromise;
    if (specificCallUpdate && specificCallUpdate.senhaAtual) {
      assert(specificCallUpdate.senhaAtual.id === ticket3.id, `Senha especifica chamada por ID: ${specificCallUpdate.senhaAtual.numero}`);
    }

    // TESTE 9
    header('TESTE 9: Nao Apareceu (No Show)');
    let noShowUpdate = null;
    const noShowPromise = new Promise((resolve) => {
      painelPublico.once('stateUpdated', (state) => { noShowUpdate = state; resolve(state); });
      setTimeout(() => resolve(null), TIMEOUT);
    });
    painelAtendente.emit('no_show_ticket', { id: ticket3.id });
    await noShowPromise;
    assert(noShowUpdate !== null, 'Painel Publico recebeu atualizacao de "nao apareceu"');
    if (noShowUpdate) {
      const ticket3State = noShowUpdate.senhas.find(s => s.id === ticket3.id);
      if (ticket3State) {
        assert(ticket3State.status === 'aguardando', `Senha voltou para "aguardando" apos no-show: ${ticket3State.status}`);
        assert(ticket3State.tentativas === 1, `Tentativas incrementadas: ${ticket3State.tentativas}`);
      }
    }

    // TESTE 10
    header('TESTE 10: Consistencia de Estado entre Paineis');
    const stateFromNew = await new Promise((resolve) => {
      const s = io(SERVER_URL, { transports: ['websocket'] });
      s.on('stateUpdated', (state) => { s.disconnect(); resolve(state); });
      setTimeout(() => { s.disconnect(); resolve(null); }, 5000);
    });
    assert(stateFromNew !== null, 'Estado final obtido com sucesso');
    if (stateFromNew) {
      const aguardando = stateFromNew.senhas.filter(s => s.status === 'aguardando');
      const concluidas = stateFromNew.senhas.filter(s => s.status === 'concluida');
      info(`Estado Final: ${aguardando.length} aguardando, ${concluidas.length} concluidas`);
      info(`Total de senhas no estado: ${stateFromNew.senhas.length}`);
      const t3InQueue = stateFromNew.senhas.find(s => s.id === ticket3.id);
      if (t3InQueue) {
        assert(t3InQueue.status === 'aguardando', `Ticket ${ticket3.numero} esta na fila apos no-show`);
      }
    }

  } catch (error) {
    fail(`Erro durante os testes: ${error.message}`);
    console.error(error);
    testsFailed++;
  } finally {
    if (painelGerador) painelGerador.disconnect();
    if (painelAtendente) painelAtendente.disconnect();
    if (painelPublico) painelPublico.disconnect();

    log('\n========================================');
    log('        RESULTADO DOS TESTES');
    log('========================================');
    log(`  Passou: ${testsPassed}`);
    log(`  Falhou: ${testsFailed}`);
    log(`  Total:  ${testsPassed + testsFailed}`);
    if (testsFailed === 0) {
      log('\n  TODOS OS TESTES PASSARAM! Comunicacao OK.');
    } else {
      log(`\n  ${testsFailed} teste(s) falharam.`);
    }
    log('');

    // Write to file
    const outputPath = path.join(__dirname, 'test_results.log');
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(`Resultados salvos em: ${outputPath}`);

    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

runTests();
