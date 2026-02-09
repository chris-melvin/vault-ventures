import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db/database.js';

const router = Router();

router.get('/balance', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = db.prepare('SELECT username, balance_cents FROM users WHERE id = ?')
    .get(req.userId!) as { username: string; balance_cents: number };

  res.json({ username: user.username, balance_cents: user.balance_cents });
});

export default router;
