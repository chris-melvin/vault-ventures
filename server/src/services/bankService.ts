import db from '../db/database.js';
import type { BankAccountState, BankTransaction } from '../../../shared/types.ts';

const INTEREST_RATE_PER_HOUR = 0.005; // 0.5% per hour

interface BankAccountRow {
  id: number;
  user_id: number;
  balance_cents: number;
  last_interest_at: number;
  total_interest_earned_cents: number;
}

function getOrCreateAccount(userId: number): BankAccountRow {
  let account = db.prepare('SELECT * FROM bank_accounts WHERE user_id = ?').get(userId) as BankAccountRow | undefined;
  if (!account) {
    db.prepare('INSERT INTO bank_accounts (user_id, balance_cents) VALUES (?, 0)').run(userId);
    account = db.prepare('SELECT * FROM bank_accounts WHERE user_id = ?').get(userId) as BankAccountRow;
  }
  return account;
}

function calculatePendingInterest(balance: number, lastInterestAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const elapsedSeconds = now - lastInterestAt;
  if (elapsedSeconds <= 0 || balance <= 0) return 0;
  const hoursElapsed = elapsedSeconds / 3600;
  return Math.floor(balance * INTEREST_RATE_PER_HOUR * hoursElapsed);
}

function applyAccruedInterest(userId: number): number {
  const account = getOrCreateAccount(userId);
  const interest = calculatePendingInterest(account.balance_cents, account.last_interest_at);
  if (interest <= 0) return 0;

  const now = Math.floor(Date.now() / 1000);
  const newBalance = account.balance_cents + interest;

  db.prepare(
    'UPDATE bank_accounts SET balance_cents = ?, last_interest_at = ?, total_interest_earned_cents = total_interest_earned_cents + ? WHERE user_id = ?'
  ).run(newBalance, now, interest, userId);

  db.prepare(
    'INSERT INTO bank_transactions (user_id, amount_cents, type, balance_after_cents) VALUES (?, ?, ?, ?)'
  ).run(userId, interest, 'INTEREST', newBalance);

  db.prepare(
    'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
  ).run(userId, interest, 'BANK_INTEREST', `Interest earned on bank balance`);

  return interest;
}

export function getAccount(userId: number): BankAccountState {
  applyAccruedInterest(userId);
  const account = getOrCreateAccount(userId);
  const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  const pending = calculatePendingInterest(account.balance_cents, account.last_interest_at);

  return {
    balance_cents: account.balance_cents,
    wallet_balance_cents: wallet.balance_cents,
    last_interest_at: account.last_interest_at,
    total_interest_earned_cents: account.total_interest_earned_cents,
    pending_interest_cents: pending,
  };
}

export function deposit(userId: number, amountCents: number): BankAccountState {
  if (amountCents <= 0) throw new Error('Amount must be positive');

  const run = db.transaction(() => {
    const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    if (wallet.balance_cents < amountCents) throw new Error('Insufficient wallet balance');

    applyAccruedInterest(userId);
    const account = getOrCreateAccount(userId);
    const newBankBalance = account.balance_cents + amountCents;

    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(amountCents, userId);
    db.prepare('UPDATE bank_accounts SET balance_cents = ? WHERE user_id = ?').run(newBankBalance, userId);

    db.prepare(
      'INSERT INTO bank_transactions (user_id, amount_cents, type, balance_after_cents) VALUES (?, ?, ?, ?)'
    ).run(userId, amountCents, 'DEPOSIT', newBankBalance);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, -amountCents, 'BANK_DEPOSIT', `Deposited to bank`);
  });

  run();
  return getAccount(userId);
}

export function withdraw(userId: number, amountCents: number): BankAccountState {
  if (amountCents <= 0) throw new Error('Amount must be positive');

  const run = db.transaction(() => {
    applyAccruedInterest(userId);
    const account = getOrCreateAccount(userId);
    if (account.balance_cents < amountCents) throw new Error('Insufficient bank balance');

    const newBankBalance = account.balance_cents - amountCents;

    db.prepare('UPDATE bank_accounts SET balance_cents = ? WHERE user_id = ?').run(newBankBalance, userId);
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(amountCents, userId);

    db.prepare(
      'INSERT INTO bank_transactions (user_id, amount_cents, type, balance_after_cents) VALUES (?, ?, ?, ?)'
    ).run(userId, -amountCents, 'WITHDRAW', newBankBalance);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, amountCents, 'BANK_WITHDRAW', `Withdrawn from bank`);
  });

  run();
  return getAccount(userId);
}

export function getHistory(userId: number, limit: number = 20): BankTransaction[] {
  return db.prepare(
    'SELECT id, amount_cents, type, balance_after_cents, timestamp FROM bank_transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(userId, limit) as BankTransaction[];
}
