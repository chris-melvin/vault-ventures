import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getAccount, deposit, withdraw, getHistory } from '../services/bankService.js';
import { checkAchievements } from '../services/achievementService.js';

const router = Router();

router.get('/account', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const account = getAccount(req.userId!);
    res.json(account);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { amount_cents } = req.body;
    if (!amount_cents || amount_cents <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }
    const account = deposit(req.userId!, amount_cents);
    checkAchievements(req.userId!);
    res.json(account);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/withdraw', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { amount_cents } = req.body;
    if (!amount_cents || amount_cents <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }
    const account = withdraw(req.userId!, amount_cents);
    res.json(account);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/history', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = getHistory(req.userId!, limit);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
