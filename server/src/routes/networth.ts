import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getNetWorth } from '../services/netWorthService.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = getNetWorth(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
