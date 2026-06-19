import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillFuelLogs() {
  const costsWithoutFuelLog = await prisma.cost.findMany({
    where: { type: 'FUEL', fuel_log: null },
  });

  console.log(`Encontrados ${costsWithoutFuelLog.length} custos FUEL sem fuel_log`);
  if (costsWithoutFuelLog.length === 0) {
    console.log('Nada a corrigir.');
    await prisma.$disconnect();
    return;
  }

  for (const cost of costsWithoutFuelLog) {
    await prisma.fuelLog.create({
      data: {
        cost_id: cost.id,
        gas_station: cost.description ?? 'Não informado',
        liters: 0,
        price_per_liter: 0,
        odometer_km: 0,
      },
    });
    console.log(`FuelLog criado para custo ${cost.id} (R$ ${cost.amount})`);
  }

  console.log('Backfill concluído');
  await prisma.$disconnect();
}

backfillFuelLogs().catch((e) => { console.error(e); process.exit(1); });
