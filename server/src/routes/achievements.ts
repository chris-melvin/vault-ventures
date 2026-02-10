import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getUserAchievements, getUserStats } from '../services/achievementService.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const data = getUserAchievements(req.userId!);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const stats = getUserStats(req.userId!);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
