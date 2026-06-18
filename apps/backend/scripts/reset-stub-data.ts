import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetStubData() {
  console.log('Removendo corridas do stub antigo...');

  const deleted = await prisma.earning.deleteMany({
    where: { external_id: { contains: '_stub_' } },
  });
  console.log(`✅ ${deleted.count} corridas stub removidas`);

  const reset = await prisma.platformCredential.updateMany({
    where: { platform: 'UBER' },
    data: { last_sync_status: 'NEVER', last_sync_at: null },
  });
  console.log(`✅ ${reset.count} credenciais resetadas para NEVER`);

  console.log('Agora dispare um novo sync: POST /integrations/UBER/sync');
  await prisma.$disconnect();
}

resetStubData().catch(console.error);
