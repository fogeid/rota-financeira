import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('=== Limpeza de dados de teste ===\n');

  const totalBefore = await prisma.earning.count();
  const manualBefore = await prisma.earning.count({ where: { origin: 'MANUAL' } });
  const syncBefore = await prisma.earning.count({ where: { origin: 'AUTO_SYNC' } });

  console.log('Corridas antes da limpeza:');
  console.log(`  Total:      ${totalBefore}`);
  console.log(`  MANUAL:     ${manualBefore}  <- serão removidas`);
  console.log(`  AUTO_SYNC:  ${syncBefore}    <- serão mantidas\n`);

  const deleted = await prisma.earning.deleteMany({ where: { origin: 'MANUAL' } });
  console.log(`${deleted.count} corridas manuais removidas\n`);

  const totalCosts = await prisma.cost.count();
  console.log(`Custos encontrados: ${totalCosts}`);

  if (process.env.REMOVE_COSTS === 'true') {
    await prisma.fuelLog.deleteMany();
    await prisma.maintenanceLog.deleteMany();
    const deletedCosts = await prisma.cost.deleteMany();
    console.log(`${deletedCosts.count} custos removidos`);
  } else {
    console.log('Para remover custos tambem, defina REMOVE_COSTS=true\n');
  }

  const totalAfter = await prisma.earning.count();
  const syncAfter = await prisma.earning.count({ where: { origin: 'AUTO_SYNC' } });

  console.log('\nCorridas apos a limpeza:');
  console.log(`  Total:     ${totalAfter}`);
  console.log(`  AUTO_SYNC: ${syncAfter}  <- corridas do sync mantidas`);

  await prisma.$disconnect();
  console.log('\nLimpeza concluida!');
}

cleanTestData().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
