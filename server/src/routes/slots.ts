import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBet } from '../middleware/validation.js';
import { spinSlots } from '../services/slotsService.js';

const router = Router();

router.post('/spin', authMiddleware, validateBet, (req: AuthRequest, res: Response): void => {
  try {
    const result = spinSlots(req.userId!, req.body.amount_cents);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
