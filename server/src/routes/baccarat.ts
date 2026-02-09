import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBet } from '../middleware/validation.js';
import { dealBaccarat } from '../services/baccaratService.js';
import { BaccaratBetType } from '../../../shared/types.ts';

const router = Router();

router.post('/deal', authMiddleware, validateBet, (req: AuthRequest, res: Response): void => {
  try {
    const { amount_cents, bet_type } = req.body;
    if (!['player', 'banker', 'tie'].includes(bet_type)) {
      res.status(400).json({ error: 'Invalid bet type' });
      return;
    }
    const result = dealBaccarat(req.userId!, amount_cents, bet_type as BaccaratBetType);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
