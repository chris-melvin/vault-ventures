import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getPrestigeStatus, executePrestige } from '../services/prestigeService.js';

const router = Router();

router.get('/status', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const status = getPrestigeStatus(req.userId!);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/execute', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = executePrestige(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
