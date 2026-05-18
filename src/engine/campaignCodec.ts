import type { CampaignConfig } from '../types';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function toBase62(num: number): string {
  if (num === 0) return CHARS[0];
  let result = '';
  let n = Math.abs(num);
  while (n > 0) {
    result = CHARS[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return num < 0 ? '-' + result : result;
}

export function encodeCampaign(config: CampaignConfig): string {
  const json = JSON.stringify(config);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeCampaign(code: string): CampaignConfig | null {
  try {
    let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as CampaignConfig;
  } catch {
    return null;
  }
}
