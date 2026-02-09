import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import db from '../db/database.js';
import { WHEEL_SYMBOLS, type WheelSymbol } from '../../../shared/types.ts';

export function validateBet(req: AuthRequest, res: Response, next: NextFunction): void {
  const { amount_cents } = req.body;

  if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
    res.status(400).json({ error: 'Invalid bet amount' });
    return;
  }

  if (amount_cents % 100 !== 0) {
    res.status(400).json({ error: 'Bet must be in whole dollar increments' });
    return;
  }

  if (amount_cents > 10000000) {
    res.status(400).json({ error: 'Maximum bet is $100,000' });
    return;
  }

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
  if (!user || user.balance_cents < amount_cents) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  next();
}

export function validateWheelBets(req: AuthRequest, res: Response, next: NextFunction): void {
  const { bets } = req.body;

  if (!bets || typeof bets !== 'object' || Array.isArray(bets)) {
    res.status(400).json({ error: 'Invalid bets: must be an object mapping symbols to amounts' });
    return;
  }

  const entries = Object.entries(bets) as [string, unknown][];

  if (entries.length === 0) {
    res.status(400).json({ error: 'Must place at least one bet' });
    return;
  }

  let totalBet = 0;

  for (const [symbol, amount] of entries) {
    if (!WHEEL_SYMBOLS.includes(symbol as WheelSymbol)) {
      res.status(400).json({ error: `Invalid symbol: ${symbol}` });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: `Invalid bet amount for ${symbol}` });
      return;
    }

    if (amount % 100 !== 0) {
      res.status(400).json({ error: 'Bets must be in whole dollar increments' });
      return;
    }

    totalBet += amount;
  }

  if (totalBet > 10000000) {
    res.status(400).json({ error: 'Total bets exceed maximum of $100,000' });
    return;
  }

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
  if (!user || user.balance_cents < totalBet) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  next();
}
