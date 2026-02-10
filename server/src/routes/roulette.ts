import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateRouletteBets } from '../middleware/validation.js';
import { spinRoulette } from '../services/rouletteService.js';

const router = Router();

router.post('/spin', authMiddleware, validateRouletteBets, (req: AuthRequest, res: Response): void => {
  try {
    const result = spinRoulette(req.userId!, req.body.bets);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
