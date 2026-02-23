
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected to server");

    const appointmentData = {
        nome: "Debug User",
        tipo: "Cadastro Novo",
        prioridade: "normal",
        cpf: "123.456.789-00",
        telefone: "(11) 99999-9999",
        bairro: "Centro",
        dataAgendada: new Date().toISOString().split('T')[0],
        horaAgendada: "10:00",
        observacoes: "Teste de Debug"
    };

    console.log("Sending appointment request:", appointmentData);

    socket.emit("schedule_appointment", appointmentData, (response) => {
        console.log("Response from server:", response);
        socket.disconnect();
    });
});

socket.on("appointmentsUpdated", (data) => {
    console.log("Received appointmentsUpdated event:", data);
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    socket.disconnect();
});
