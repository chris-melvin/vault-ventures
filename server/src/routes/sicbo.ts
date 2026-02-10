import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateSicBoBets } from '../middleware/validation.js';
import { rollSicBo } from '../services/sicboService.js';

const router = Router();

router.post('/roll', authMiddleware, validateSicBoBets, (req: AuthRequest, res: Response): void => {
  try {
    const result = rollSicBo(req.userId!, req.body.bets);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
