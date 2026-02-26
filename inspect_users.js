import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspect() {
    try {
        const users = await prisma.usuario.findMany();
        console.log("USERS:", JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspect();
