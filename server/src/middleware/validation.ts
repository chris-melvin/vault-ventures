import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import db from '../db/database.js';
import { WHEEL_SYMBOLS, type WheelSymbol, SIC_BO_BET_TYPES, type SicBoBetType, type RouletteBet } from '../../../shared/types.ts';

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

  const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
  if (!user || user.balance_cents < totalBet) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  next();
}

export function validateSicBoBets(req: AuthRequest, res: Response, next: NextFunction): void {
  const { bets } = req.body;

  if (!bets || typeof bets !== 'object' || Array.isArray(bets)) {
    res.status(400).json({ error: 'Invalid bets: must be an object mapping bet types to amounts' });
    return;
  }

  const entries = Object.entries(bets) as [string, unknown][];

  if (entries.length === 0) {
    res.status(400).json({ error: 'Must place at least one bet' });
    return;
  }

  let totalBet = 0;

  for (const [betType, amount] of entries) {
    if (!SIC_BO_BET_TYPES.includes(betType as SicBoBetType)) {
      res.status(400).json({ error: `Invalid bet type: ${betType}` });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: `Invalid bet amount for ${betType}` });
      return;
    }

    if (amount % 100 !== 0) {
      res.status(400).json({ error: 'Bets must be in whole dollar increments' });
      return;
    }

    totalBet += amount;
  }

  const userSicBo = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
  if (!userSicBo || userSicBo.balance_cents < totalBet) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  next();
}

const VALID_ROULETTE_BET_TYPES = new Set([
  'straight', 'split', 'street', 'corner', 'line',
  'dozen_1', 'dozen_2', 'dozen_3',
  'column_1', 'column_2', 'column_3',
  'red', 'black', 'odd', 'even', 'high', 'low',
]);

export function validateRouletteBets(req: AuthRequest, res: Response, next: NextFunction): void {
  const { bets } = req.body;

  if (!Array.isArray(bets) || bets.length === 0) {
    res.status(400).json({ error: 'Must place at least one bet' });
    return;
  }

  let totalBet = 0;

  for (const bet of bets as RouletteBet[]) {
    if (!bet.type || !VALID_ROULETTE_BET_TYPES.has(bet.type)) {
      res.status(400).json({ error: `Invalid bet type: ${bet.type}` });
      return;
    }

    if (!Array.isArray(bet.numbers) || bet.numbers.length === 0) {
      res.status(400).json({ error: 'Each bet must specify covered numbers' });
      return;
    }

    for (const num of bet.numbers) {
      if (typeof num !== 'number' || num < 0 || num > 36 || !Number.isInteger(num)) {
        res.status(400).json({ error: `Invalid number: ${num}` });
        return;
      }
    }

    if (typeof bet.amount_cents !== 'number' || bet.amount_cents <= 0) {
      res.status(400).json({ error: 'Invalid bet amount' });
      return;
    }

    if (bet.amount_cents % 100 !== 0) {
      res.status(400).json({ error: 'Bets must be in whole dollar increments' });
      return;
    }

    totalBet += bet.amount_cents;
  }

  const userRoulette = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
  if (!userRoulette || userRoulette.balance_cents < totalBet) {
    res.status(400).json({ error: 'Insufficient balance' });
    return;
  }

  next();
}
