import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getStatsDeepDive } from '../services/statsService.js';

const router = Router();

router.get('/deep-dive', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = getStatsDeepDive(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
