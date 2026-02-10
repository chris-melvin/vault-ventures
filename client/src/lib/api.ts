import { API_BASE } from './constants';
import type {
  AuthResponse,
  WalletResponse,
  WheelSpinResult,
  WheelSymbol,
  SlotsSpinResult,
  BlackjackState,
  BaccaratResult,
  BaccaratBetType,
  UTHState,
  UTHAction,
  GameHistoryEntry,
} from '@shared/types';

// Initialize token from localStorage immediately so it's available before any effects run
let authToken: string | null = localStorage.getItem('casino_token');

let onUnauthorized: (() => void) | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

// Auth
export const auth = {
  register: (username: string, pin: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    }),
  login: (username: string, pin: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    }),
};

// Wallet
export const wallet = {
  balance: () => request<WalletResponse>('/wallet/balance'),
};

// Wheel
export const wheel = {
  spin: (bets: Partial<Record<WheelSymbol, number>>) =>
    request<WheelSpinResult>('/wheel/spin', {
      method: 'POST',
      body: JSON.stringify({ bets }),
    }),
};

// Slots
export const slots = {
  spin: (amount_cents: number) =>
    request<SlotsSpinResult>('/slots/spin', {
      method: 'POST',
      body: JSON.stringify({ amount_cents }),
    }),
};

// Blackjack
export const blackjack = {
  deal: (amount_cents: number) =>
    request<BlackjackState>('/blackjack/deal', {
      method: 'POST',
      body: JSON.stringify({ amount_cents }),
    }),
  hit: (session_id: string) =>
    request<BlackjackState>('/blackjack/hit', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
  stand: (session_id: string) =>
    request<BlackjackState>('/blackjack/stand', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
  double: (session_id: string) =>
    request<BlackjackState>('/blackjack/double', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
  split: (session_id: string) =>
    request<BlackjackState>('/blackjack/split', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
  insurance: (session_id: string, accept: boolean) =>
    request<BlackjackState>('/blackjack/insurance', {
      method: 'POST',
      body: JSON.stringify({ session_id, accept }),
    }),
  surrender: (session_id: string) =>
    request<BlackjackState>('/blackjack/surrender', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
};

// Baccarat
export const baccarat = {
  deal: (amount_cents: number, bet_type: BaccaratBetType) =>
    request<BaccaratResult>('/baccarat/deal', {
      method: 'POST',
      body: JSON.stringify({ amount_cents, bet_type }),
    }),
};

// History
export const history = {
  list: (game_type: string, limit = 20) =>
    request<GameHistoryEntry[]>(`/history/${game_type}?limit=${limit}`),
};

// Ultimate Texas Hold'em
export const uth = {
  deal: (ante_cents: number, trips_cents?: number) =>
    request<UTHState>('/uth/deal', {
      method: 'POST',
      body: JSON.stringify({ ante_cents, trips_cents }),
    }),
  action: (session_id: string, action: UTHAction) =>
    request<UTHState>('/uth/action', {
      method: 'POST',
      body: JSON.stringify({ session_id, action }),
    }),
};
