import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getBusinessEmpire, buyBusiness, upgradeBusiness, collectIncome } from '../services/businessService.js';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const state = getBusinessEmpire(req.userId!);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/buy', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = buyBusiness(req.userId!, req.body.business_type_id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/upgrade', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = upgradeBusiness(req.userId!, req.body.business_id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/collect', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = collectIncome(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
