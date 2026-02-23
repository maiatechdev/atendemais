import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando limpeza de dados ---');

    try {
        // Deletar todas as senhas
        const deletedSenhas = await prisma.senha.deleteMany({});
        console.log(`- ${deletedSenhas.count} senhas removidas.`);

        // Deletar todos os agendamentos
        const deletedAgendamentos = await prisma.agendamento.deleteMany({});
        console.log(`- ${deletedAgendamentos.count} agendamentos removidos.`);

        // Resetar contadores
        await prisma.config.upsert({
            where: { key: 'contadorNormal' },
            update: { value: '1' },
            create: { key: 'contadorNormal', value: '1' }
        });

        await prisma.config.upsert({
            where: { key: 'contadorPrioritaria' },
            update: { value: '1' },
            create: { key: 'contadorPrioritaria', value: '1' }
        });

        console.log('- Contadores de senhas resetados para 001.');
        console.log('\n✅ Sistema limpo e pronto para uso!');
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
