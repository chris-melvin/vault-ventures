export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySeed(serverSeed: string, expectedHash: string): Promise<boolean> {
  const hash = await sha256(serverSeed);
  return hash === expectedHash;
}

export async function verifyResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  maxValue: number
): Promise<number> {
  const hash = await hmacSha256(serverSeed, `${clientSeed}:${nonce}`);
  return parseInt(hash.substring(0, 8), 16) % maxValue;
}
