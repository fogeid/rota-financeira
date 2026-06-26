import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStuckBalances() {
  const stuckBalances = await prisma.referralBalance.findMany({
    where: { pending: { gt: 0 } },
  });

  console.log(`Encontrados ${stuckBalances.length} saldos com pending > 0`);

  for (const balance of stuckBalances) {
    await prisma.referralBalance.update({
      where: { id: balance.id },
      data: {
        available: { increment: balance.pending },
        pending: 0,
      },
    });
    console.log(`Migrado R$ ${balance.pending} de pending para available (user ${balance.user_id})`);
  }

  console.log('Correcao concluida');
  await prisma.$disconnect();
}

fixStuckBalances().catch(console.error);
