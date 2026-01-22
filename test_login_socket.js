const { io } = require('socket.io-client');

async function test() {
    console.log('Connecting...');
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
        console.log('Connected to server');

        console.log('Attempting login...');
        socket.emit('login', { email: 'admin@atende.plus', password: '123456' }, (response) => {
            console.log('Login Response:', response);
            process.exit(0);
        });
    });

    socket.on('connect_error', (err) => {
        console.error('Connection Error:', err.message);
        process.exit(1);
    });
}

test();
