/**
 * Seed: cria um influencer de teste com status APPROVED para uso no dashboard.
 * Executar: npx ts-node -r tsconfig-paths/register prisma/seed-influencer.ts
 */
import { PrismaClient, InfluencerTier, InfluencerStatus, ReferralType, Plan } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const IV_LENGTH = 12;

function loadKey(value: string): Buffer {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('Chave deve ter 32 bytes em base64');
  return key;
}

function encrypt(value: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function hmac(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value.toLowerCase()).digest('hex');
}

async function main() {
  const fieldKey = loadKey(process.env.FIELD_ENCRYPTION_KEY!);
  const hashSecret = process.env.HASH_SECRET!;

  const email = 'influencer@teste.com';
  const password = 'Senha@123';
  const name = 'Zé Motorista';
  const channelName = 'Canal do Zé Motorista';
  const slug = 'zemoto';

  const emailHash = hmac(email, hashSecret);
  const cpfRaw = '00000000191'; // CPF de teste válido
  const cpfHash = hmac(cpfRaw, hashSecret);
  const phoneRaw = '+5511988880099';
  const phoneHash = hmac(phoneRaw, hashSecret);

  // Verifica se já existe
  const existing = await prisma.user.findUnique({ where: { email_hash: emailHash } });
  if (existing) {
    console.log('✓ Usuário já existe — e-mail:', email);
    let profile = await prisma.influencerProfile.findUnique({ where: { user_id: existing.id } });
    if (!profile) {
      // Garante que existe ReferralCode INFLUENCER
      let rc = await prisma.referralCode.findFirst({ where: { user_id: existing.id, type: ReferralType.INFLUENCER } });
      if (!rc) {
        rc = await prisma.referralCode.create({
          data: { user_id: existing.id, code: slug.toUpperCase(), slug, type: ReferralType.INFLUENCER, clicks: 0 },
        });
        console.log('✓ ReferralCode criado:', rc.code);
      }
      profile = await prisma.influencerProfile.create({
        data: {
          user_id: existing.id,
          channel_name: channelName,
          channel_url: 'https://youtube.com/@zemoto',
          followers: 85000,
          niche: 'Motoristas de aplicativo e finanças',
          tier: InfluencerTier.MEDIUM,
          status: InfluencerStatus.APPROVED,
          commission_rate: 4.0,
          approved_at: new Date(),
          pix_key: '11999990001',
        },
      });
      console.log('✓ Perfil influencer criado com status APPROVED');
    } else {
      console.log('✓ Status do perfil influencer:', profile.status);
    }
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  CREDENCIAIS DO DASHBOARD');
    console.log('  URL:   http://localhost:3001/login');
    console.log('  Email: influencer@teste.com');
    console.log('  Senha: Senha@123');
    console.log('═══════════════════════════════════════════');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: encrypt(email, fieldKey),
      email_hash: emailHash,
      cpf: encrypt(cpfRaw, fieldKey),
      cpf_hash: cpfHash,
      phone: encrypt(phoneRaw, fieldKey),
      phone_hash: phoneHash,
      password_hash: passwordHash,
      plan: Plan.FREE,
      is_active: true,
    },
  });

  console.log('✓ Usuário criado:', user.id);

  // Cria ReferralCode do tipo INFLUENCER
  const referralCode = await prisma.referralCode.create({
    data: {
      user_id: user.id,
      code: slug.toUpperCase(),
      slug,
      type: ReferralType.INFLUENCER,
      clicks: 0,
    },
  });

  console.log('✓ ReferralCode criado:', referralCode.code);

  // Cria perfil de influencer APPROVED
  await prisma.influencerProfile.create({
    data: {
      user_id: user.id,
      channel_name: channelName,
      channel_url: 'https://youtube.com/@zemoto',
      followers: 85000,
      niche: 'Motoristas de aplicativo e finanças',
      tier: InfluencerTier.MEDIUM,
      status: InfluencerStatus.APPROVED,
      commission_rate: 4.0,
      approved_at: new Date(),
      pix_key: '11999990001',
    },
  });

  console.log('✓ Perfil influencer criado com status APPROVED');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  CREDENCIAIS DO DASHBOARD');
  console.log('  URL:   http://localhost:3001/login');
  console.log('  Email: influencer@teste.com');
  console.log('  Senha: Senha@123');
  console.log('═══════════════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
