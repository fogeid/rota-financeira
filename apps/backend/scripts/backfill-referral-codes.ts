import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateUniqueCode(name: string): Promise<string> {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6)
    .padEnd(6, 'X');

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = String(Math.floor(Math.random() * 90) + 10);
    const code = `${prefix}${suffix}`;
    const existing = await prisma.referralCode.findUnique({ where: { code } });
    if (!existing) return code;
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let fallback = '';
  for (let i = 0; i < 8; i++) fallback += chars[Math.floor(Math.random() * chars.length)];
  return fallback;
}

async function backfillReferralCodes() {
  const usersWithoutCode = await prisma.user.findMany({
    where: { referral_code: null },
    select: { id: true, name: true },
  });

  console.log(`Encontrados ${usersWithoutCode.length} usuários sem código de indicação`);

  if (usersWithoutCode.length === 0) {
    console.log('Nenhum usuário para corrigir. Encerrando.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const user of usersWithoutCode) {
    try {
      const code = await generateUniqueCode(user.name);

      await prisma.$transaction([
        prisma.referralCode.create({
          data: { user_id: user.id, code },
        }),
        prisma.referralBalance.create({
          data: { user_id: user.id },
        }),
      ]);

      console.log(`✅ ${user.name} (${user.id}): código ${code} criado`);
      success++;
    } catch (error) {
      console.error(`❌ Falha para usuário ${user.id} (${user.name}):`, (error as Error).message);
      failed++;
    }
  }

  console.log(`\nBackfill concluído: ${success} criados, ${failed} falhas`);
}

backfillReferralCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
