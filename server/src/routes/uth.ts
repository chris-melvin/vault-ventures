import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { dealUTH, uthAction } from '../services/uthService.js';
import db from '../db/database.js';
import type { UTHAction } from '../../../shared/types.ts';

const router = Router();

const VALID_ACTIONS: UTHAction[] = ['check', 'bet4x', 'bet3x', 'bet2x', 'bet1x', 'fold'];

router.post('/deal', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { ante_cents, trips_cents = 0 } = req.body;

    if (!ante_cents || typeof ante_cents !== 'number' || ante_cents <= 0) {
      res.status(400).json({ error: 'Invalid ante amount' });
      return;
    }
    if (ante_cents % 100 !== 0) {
      res.status(400).json({ error: 'Ante must be in whole dollar increments' });
      return;
    }
    if (trips_cents && (typeof trips_cents !== 'number' || trips_cents < 0 || trips_cents % 100 !== 0)) {
      res.status(400).json({ error: 'Invalid trips amount' });
      return;
    }

    const totalRequired = ante_cents * 2 + trips_cents; // ante + blind + trips
    const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(req.userId!) as { balance_cents: number } | undefined;
    if (!user || user.balance_cents < totalRequired) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    const result = dealUTH(req.userId!, ante_cents, trips_cents);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/action', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { session_id, action } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'Missing session_id' });
      return;
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const result = uthAction(session_id, req.userId!, action as UTHAction);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
