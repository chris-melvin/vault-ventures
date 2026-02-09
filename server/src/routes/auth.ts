import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import { hashPin, generateToken, generateSalt } from '../services/rng.js';

const router = Router();

router.post('/register', (req: Request, res: Response): void => {
  const { username, pin } = req.body;

  if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
    res.status(400).json({ error: 'Username must be 3-20 characters' });
    return;
  }

  if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const salt = generateSalt();
  const pinHash = hashPin(pin, salt);

  const result = db.prepare(
    'INSERT INTO users (username, pin_hash, salt) VALUES (?, ?, ?)'
  ).run(username, pinHash, salt);

  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, result.lastInsertRowid);

  const user = db.prepare('SELECT id, username, balance_cents FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as { id: number; username: string; balance_cents: number };

  res.json({ token, user });
});

router.post('/login', (req: Request, res: Response): void => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    res.status(400).json({ error: 'Username and PIN required' });
    return;
  }

  const user = db.prepare('SELECT id, username, pin_hash, salt, balance_cents FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; pin_hash: string; salt: string; balance_cents: number } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const pinHash = hashPin(pin, user.salt);
  if (pinHash !== user.pin_hash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, balance_cents: user.balance_cents },
  });
});

export default router;
