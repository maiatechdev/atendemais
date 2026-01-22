import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
    try {
        console.log('Apagando usuários antigos...');
        await prisma.usuario.deleteMany({});
        console.log('Usuários apagados.');

        console.log('Criando Admin Padrão...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        await prisma.usuario.create({
            data: {
                nome: 'Administrador Padrão',
                email: 'admin@atende.plus',
                senha: hashedPassword,
                funcao: 'Administrador',
                isAdmin: true
            }
        });

        console.log('Admin criado: admin@atende.plus / 123456');
    } catch (e) {
        console.error('Erro:', e);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
