
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
    try {
        const users = await prisma.usuario.findMany();
        const tickets = await prisma.senha.findMany();
        const config = await prisma.config.findMany();

        console.log("USERS:", users);
        console.log("TICKETS:", tickets);
        console.log("CONFIG:", config);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();
