import Redis from 'ioredis';
import { LOGIN_BLOCK_DURATION_SECONDS, LOGIN_MAX_ATTEMPTS, LoginThrottleService } from './login-throttle.service';

/** Fake mínimo de Redis (incr/expire/set/ttl/del) para testar o throttle sem depender de um servidor real. */
class FakeRedis {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async incr(key: string): Promise<number> {
    this.isExpired(key);
    const entry = this.store.get(key);
    const value = entry ? Number(entry.value) + 1 : 1;
    this.store.set(key, { value: String(value), expiresAt: entry?.expiresAt ?? null });
    return value;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async set(key: string, value: string, _mode: string, seconds: number): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async ttl(key: string): Promise<number> {
    if (this.isExpired(key)) {
      return -2;
    }
    const entry = this.store.get(key);
    if (!entry) {
      return -2;
    }
    if (entry.expiresAt === null) {
      return -1;
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
      }
    }
    return count;
  }
}

describe('LoginThrottleService', () => {
  let service: LoginThrottleService;
  const cpfHash = 'cpf-hash';

  beforeEach(() => {
    service = new LoginThrottleService(new FakeRedis() as unknown as Redis);
  });

  it('não bloqueia o CPF quando não há tentativas registradas', async () => {
    expect(await service.getBlockRemainingSeconds(cpfHash)).toBeNull();
  });

  it('não bloqueia antes de atingir o limite de tentativas', async () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) {
      await service.recordFailure(cpfHash);
    }

    expect(await service.getBlockRemainingSeconds(cpfHash)).toBeNull();
  });

  it('bloqueia o CPF por 15 minutos após 5 tentativas falhas consecutivas', async () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await service.recordFailure(cpfHash);
    }

    const remaining = await service.getBlockRemainingSeconds(cpfHash);

    expect(remaining).not.toBeNull();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(LOGIN_BLOCK_DURATION_SECONDS);
  });

  it('reseta a contagem e o bloqueio após um login bem-sucedido', async () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await service.recordFailure(cpfHash);
    }
    expect(await service.getBlockRemainingSeconds(cpfHash)).not.toBeNull();

    await service.reset(cpfHash);

    expect(await service.getBlockRemainingSeconds(cpfHash)).toBeNull();
  });
});
