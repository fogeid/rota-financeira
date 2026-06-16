import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

/**
 * Criptografia e hashing de campos sensíveis (CPF, e-mail, telefone)
 * conforme docs/05-SECURITY.md seção 3.
 */
@Injectable()
export class EncryptionService {
  private readonly fieldKey: Buffer;
  private readonly hashSecret: string;
  private readonly masterKey: Buffer;

  constructor(config: ConfigService) {
    this.fieldKey = this.loadKey(config.getOrThrow<string>('FIELD_ENCRYPTION_KEY'), 'FIELD_ENCRYPTION_KEY');
    this.masterKey = this.loadKey(config.getOrThrow<string>('ENCRYPTION_MASTER_KEY'), 'ENCRYPTION_MASTER_KEY');
    this.hashSecret = config.getOrThrow<string>('HASH_SECRET');
  }

  private loadKey(value: string, name: string): Buffer {
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) {
      throw new Error(`${name} deve ter 32 bytes (256 bits) codificados em base64`);
    }
    return key;
  }

  /**
   * Criptografa um valor com AES-256-GCM.
   * Output: base64(iv + authTag + ciphertext)
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.fieldKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decriptografa um valor gerado por encrypt().
   */
  decrypt(payload: string): string {
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.fieldKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Hash determinístico (HMAC-SHA256) usado para lookup de cpf_hash, email_hash e phone_hash.
   * Nunca usado para reverter o valor original.
   */
  hash(value: string): string {
    return crypto.createHmac('sha256', this.hashSecret).update(value.toLowerCase()).digest('hex');
  }

  /**
   * Deriva uma chave AES-256 por usuário a partir da master key (HKDF), usada para
   * criptografar credenciais de plataformas (Uber/99) — docs/05-SECURITY.md seção 3.
   */
  deriveUserKey(userId: string): Buffer {
    return Buffer.from(crypto.hkdfSync('sha256', this.masterKey, userId, 'platform-credentials', 32));
  }
}
