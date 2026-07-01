import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmins() {
  const admins = [
    {
      name: 'Diego',
      email: 'diego@motoristarico.app',
      password: 'TROCAR_DEPOIS',
      role: AdminRole.SUPER_ADMIN,
    },
    // Exemplo de suporte futuro (comentado — descomentar ao contratar):
    // { name: 'Nome Suporte', email: 'suporte@motoristarico.app', password: 'TROCAR_DEPOIS', role: AdminRole.SUPPORT_DRIVER_INFLUENCER },
  ];

  for (const admin of admins) {
    const password_hash = await bcrypt.hash(admin.password, 12);
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      update: {},
      create: { name: admin.name, email: admin.email, password_hash, role: admin.role },
    });
    console.log(`✅ Admin criado: ${admin.email} (${admin.role})`);
  }
}

seedAdmins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
