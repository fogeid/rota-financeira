import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptionService } from './encryption.service';

function buildConfig(overrides: Partial<Record<string, string>> = {}): ConfigService {
  const values: Record<string, string> = {
    FIELD_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    ENCRYPTION_MASTER_KEY: crypto.randomBytes(32).toString('base64'),
    HASH_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
    ...overrides,
  };

  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('EncryptionService', () => {
  it('criptografa e decriptografa um CPF, retornando o valor original', () => {
    const service = new EncryptionService(buildConfig());
    const cpf = '11144477735';

    const encrypted = service.encrypt(cpf);

    expect(encrypted).not.toContain(cpf);
    expect(service.decrypt(encrypted)).toBe(cpf);
  });

  it('gera ciphertexts diferentes para o mesmo valor (IV aleatório)', () => {
    const service = new EncryptionService(buildConfig());
    const cpf = '11144477735';

    const first = service.encrypt(cpf);
    const second = service.encrypt(cpf);

    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe(cpf);
    expect(service.decrypt(second)).toBe(cpf);
  });

  it('rejeita decriptografia com a chave de criptografia errada', () => {
    const service = new EncryptionService(buildConfig());
    const otherService = new EncryptionService(buildConfig());

    const encrypted = service.encrypt('11144477735');

    expect(() => otherService.decrypt(encrypted)).toThrow();
  });

  it('gera hash determinístico e case-insensitive para lookup', () => {
    const service = new EncryptionService(buildConfig());

    expect(service.hash('carlos@email.com')).toBe(service.hash('CARLOS@EMAIL.COM'));
    expect(service.hash('11144477735')).toBe(service.hash('11144477735'));
  });

  it('gera hashes diferentes para HASH_SECRET diferentes', () => {
    const serviceA = new EncryptionService(buildConfig({ HASH_SECRET: 'segredo-a-com-mais-de-32-caracteres' }));
    const serviceB = new EncryptionService(buildConfig({ HASH_SECRET: 'segredo-b-com-mais-de-32-caracteres' }));

    expect(serviceA.hash('11144477735')).not.toBe(serviceB.hash('11144477735'));
  });

  it('deriva chaves de 256 bits diferentes por usuário a partir da master key', () => {
    const service = new EncryptionService(buildConfig());

    const keyUser1 = service.deriveUserKey('user-1');
    const keyUser2 = service.deriveUserKey('user-2');

    expect(keyUser1).toHaveLength(32);
    expect(keyUser2).toHaveLength(32);
    expect(keyUser1.equals(keyUser2)).toBe(false);
  });
});
