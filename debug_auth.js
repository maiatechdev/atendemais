import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debug() {
    try {
        const email = 'admin@atende.plus';
        console.log(`Buscando usuário: ${email}`);

        const user = await prisma.usuario.findUnique({ where: { email } });

        if (!user) {
            console.log('❌ Usuário não encontrado no banco!');
            return;
        }

        console.log('✅ Usuário encontrado:', user.nome);
        console.log('🔑 Hash armazenado:', user.senha);

        const password = '123456';
        const isMatch = await bcrypt.compare(password, user.senha);

        console.log(`🛠️ Testando senha '${password}': ${isMatch ? '✅ SUCESSO' : '❌ FALHA'}`);

    } catch (e) {
        console.error('Erro:', e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
