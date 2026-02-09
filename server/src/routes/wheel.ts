import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateWheelBets } from '../middleware/validation.js';
import { spinWheel } from '../services/wheelService.js';

const router = Router();

router.post('/spin', authMiddleware, validateWheelBets, (req: AuthRequest, res: Response): void => {
  try {
    const result = spinWheel(req.userId!, req.body.bets);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
