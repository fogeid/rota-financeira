import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { Platform, SyncStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { IntegrationsService } from './integrations.service';

// Minimal PrismaService mock
const mockPrisma = {
  platformCredential: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  earning: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockEncryption = {
  deriveUserKey: jest.fn().mockReturnValue(Buffer.alloc(32, 0x42)),
};

const mockQueue = { add: jest.fn() };

const USER_ID = 'user-uuid-1';
const PLATFORM = Platform.UBER;

describe('IntegrationsService', () => {
  let service: IntegrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegrationsService(
      mockPrisma as never,
      mockEncryption as never,
      mockQueue as never,
    );
  });

  // ─── Criptografia com chave derivada por usuário ──────────────────────────

  describe('encryptCredentials / decryptCredentials', () => {
    it('round-trips credentials correctly', () => {
      const realKey = crypto.randomBytes(32);
      mockEncryption.deriveUserKey.mockReturnValue(realKey);

      const credentials = { email: 'motorista@email.com', password: 'abc123' };
      const encrypted = service.encryptCredentials(credentials, USER_ID);

      expect(typeof encrypted).toBe('string');
      // Encrypted must NOT contain the plain credentials
      expect(encrypted).not.toContain('motorista@email.com');
      expect(encrypted).not.toContain('abc123');

      const decrypted = service.decryptCredentials(encrypted, USER_ID);
      expect(decrypted).toEqual(credentials);
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      mockEncryption.deriveUserKey.mockReturnValue(crypto.randomBytes(32));

      const credentials = { email: 'a@b.com', password: 'pw' };
      const enc1 = service.encryptCredentials(credentials, USER_ID);
      const enc2 = service.encryptCredentials(credentials, USER_ID);
      expect(enc1).not.toBe(enc2);
    });

    it('different users produce different ciphertext (HKDF per user)', () => {
      // Simulate HKDF: different input userId → different derived key
      mockEncryption.deriveUserKey.mockImplementation((uid: string) =>
        crypto.createHmac('sha256', 'master').update(uid).digest(),
      );

      const credentials = { email: 'a@b.com', password: 'pw' };
      const enc1 = service.encryptCredentials(credentials, 'user-1');
      const enc2 = service.encryptCredentials(credentials, 'user-2');
      expect(enc1).not.toBe(enc2);
    });

    it('decryption with wrong user key throws', () => {
      let callCount = 0;
      mockEncryption.deriveUserKey.mockImplementation(() => {
        // Return a different random key on each call to simulate different user keys
        return callCount++ === 0 ? crypto.randomBytes(32) : crypto.randomBytes(32);
      });

      const credentials = { email: 'a@b.com', password: 'pw' };
      const encrypted = service.encryptCredentials(credentials, 'user-1');
      expect(() => service.decryptCredentials(encrypted, 'user-2')).toThrow();
    });
  });

  // ─── connect ──────────────────────────────────────────────────────────────

  describe('connect', () => {
    it('throws ConflictException if platform already connected', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue({ id: 'cred-1' });
      await expect(
        service.connect(USER_ID, { platform: PLATFORM, credentials: { email: 'e', password: 'p' } }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates credential and enqueues sync on success', async () => {
      const crypto = require('crypto') as typeof import('crypto');
      mockEncryption.deriveUserKey.mockReturnValue(crypto.randomBytes(32));
      mockPrisma.platformCredential.findUnique.mockResolvedValue(null);
      mockPrisma.platformCredential.create.mockResolvedValue({ id: 'cred-new' });

      const result = await service.connect(USER_ID, {
        platform: PLATFORM,
        credentials: { email: 'e@mail.com', password: 'pw' },
      });

      expect(mockPrisma.platformCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: USER_ID,
            platform: PLATFORM,
            last_sync_status: SyncStatus.NEVER,
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.message).toContain('conectada');
    });
  });

  // ─── disconnect ───────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('deletes credential immediately', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue({ id: 'cred-1' });
      mockPrisma.platformCredential.delete.mockResolvedValue({});

      const result = await service.disconnect(USER_ID, PLATFORM);
      expect(mockPrisma.platformCredential.delete).toHaveBeenCalledWith({
        where: { user_id_platform: { user_id: USER_ID, platform: PLATFORM } },
      });
      expect(result.message).toContain('removidas');
    });

    it('throws NotFoundException when not connected', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue(null);
      await expect(service.disconnect(USER_ID, PLATFORM)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── triggerManualSync ────────────────────────────────────────────────────

  describe('triggerManualSync', () => {
    it('throws NotFoundException when platform not connected', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue(null);
      await expect(service.triggerManualSync(USER_ID, PLATFORM)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws TooManyRequestsException when sync is in progress', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue({
        is_active: true,
        last_sync_status: SyncStatus.IN_PROGRESS,
      });
      await expect(service.triggerManualSync(USER_ID, PLATFORM)).rejects.toBeInstanceOf(HttpException);
    });

    it('enqueues sync job when valid', async () => {
      mockPrisma.platformCredential.findUnique.mockResolvedValue({
        is_active: true,
        last_sync_status: SyncStatus.SUCCESS,
      });
      const result = await service.triggerManualSync(USER_ID, PLATFORM);
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.message).toContain('Sync iniciado');
    });
  });
});
