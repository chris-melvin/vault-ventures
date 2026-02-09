import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import db from '../db/database.js';

const router = Router();

router.get('/:game_type', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { game_type } = req.params;
    const limitParam = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

    const rows = db.prepare(
      'SELECT id, game_type, result_data, timestamp FROM game_logs WHERE user_id = ? AND game_type = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(req.userId!, game_type, limit) as { id: number; game_type: string; result_data: string; timestamp: number }[];

    const entries = rows.map(row => ({
      id: row.id,
      game_type: row.game_type,
      result_data: JSON.parse(row.result_data),
      timestamp: row.timestamp,
    }));

    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
