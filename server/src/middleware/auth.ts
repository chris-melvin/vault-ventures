import { Request, Response, NextFunction } from 'express';
import db from '../db/database.js';

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = header.slice(7);
  const session = db.prepare(
    'SELECT s.user_id, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
  ).get(token) as { user_id: number; username: string } | undefined;

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = session.user_id;
  req.username = session.username;
  next();
}
