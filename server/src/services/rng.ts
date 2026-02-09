import { randomBytes, createHmac, createHash, scryptSync } from 'crypto';

export function generateSeed(): string {
  return randomBytes(32).toString('hex');
}

export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

export function hmacResult(serverSeed: string, clientSeed: string, nonce: number): string {
  return createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex');
}

export function hashToNumber(hash: string, max: number): number {
  // Use first 8 hex chars (32 bits)
  const value = parseInt(hash.substring(0, 8), 16);
  return value % max;
}

export function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, 64).toString('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}
