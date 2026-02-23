import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword(email, newPassword) {
    try {
        const user = await prisma.usuario.findUnique({ where: { email } });

        if (!user) {
            console.log(`❌ Usuário não encontrado: ${email}`);
            await prisma.$disconnect();
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await prisma.usuario.update({
            where: { email },
            data: { senha: hash }
        });

        console.log(`✅ Senha resetada com sucesso!`);
        console.log(`   Email: ${email}`);
        console.log(`   Nova senha: ${newPassword}`);
        console.log(`   Nome: ${user.nome}`);
        console.log(`   Função: ${user.funcao}`);

    } catch (error) {
        console.log(`❌ Erro ao resetar senha: ${error.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

// Pegar argumentos da linha de comando
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log('');
    console.log('📝 USO:');
    console.log('   node reset_password.js <email> <nova_senha>');
    console.log('');
    console.log('📋 EXEMPLO:');
    console.log('   node reset_password.js lucas.andr97@gmail.com 123456');
    console.log('');
    console.log('👥 USUÁRIOS DISPONÍVEIS:');

    // Listar todos os usuários
    prisma.usuario.findMany().then(users => {
        users.forEach(u => {
            console.log(`   - ${u.email} (${u.nome} - ${u.funcao})`);
        });
        console.log('');
        prisma.$disconnect();
    });
} else {
    resetPassword(email, newPassword);
}
