
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        const servic = await prisma.servico.findMany();
        console.log("Servicos:", JSON.stringify(servic, null, 2));

        const users = await prisma.usuario.findMany();
        console.log("Usuarios:", JSON.stringify(users, null, 2));

        const agendas = await prisma.agendamento.findMany();
        console.log("Agendamentos:", JSON.stringify(agendas, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
