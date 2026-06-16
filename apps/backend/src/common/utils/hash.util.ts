import * as crypto from 'crypto';

/**
 * SHA-256 simples (hex) usado para refresh tokens e códigos OTP —
 * docs/05-SECURITY.md seção 3 e 4 ("token_hash", "code_hash").
 */
export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
