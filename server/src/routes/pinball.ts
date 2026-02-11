import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { spinPinball } from '../services/pinballService.js';
import db from '../db/database.js';

const router = Router();

router.post('/spin', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { amount_cents, bet_level = 1 } = req.body;

    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
      res.status(400).json({ error: 'Invalid bet amount' });
      return;
    }

    if (amount_cents % 100 !== 0) {
      res.status(400).json({ error: 'Bet must be in whole dollar increments' });
      return;
    }

    const level = Math.max(1, Math.min(3, Math.floor(bet_level)));
    const totalCost = amount_cents * level;

    const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
    if (!user || user.balance_cents < totalCost) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    const result = spinPinball(req.userId!, amount_cents, level);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
