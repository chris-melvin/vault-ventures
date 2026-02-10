import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBet } from '../middleware/validation.js';
import { dealBlackjack, playerHit, playerStand, playerDouble, playerSplit, playerInsurance, playerSurrender } from '../services/blackjackService.js';

const router = Router();

router.post('/deal', authMiddleware, validateBet, (req: AuthRequest, res: Response): void => {
  try {
    const result = dealBlackjack(req.userId!, req.body.amount_cents);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/hit', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerHit(req.body.session_id, req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stand', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerStand(req.body.session_id, req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/double', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerDouble(req.body.session_id, req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/split', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerSplit(req.body.session_id, req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/insurance', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerInsurance(req.body.session_id, req.userId!, req.body.accept);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/surrender', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = playerSurrender(req.body.session_id, req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
