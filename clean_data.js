
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
    try {
        const deleted = await prisma.agendamento.deleteMany({
            where: {
                tipo: ""
            }
        });
        console.log("Deleted invalid appointments:", deleted.count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

clean();
