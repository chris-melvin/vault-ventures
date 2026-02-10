import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import {
  getMarketItems, getMarketItemDetail, buyItem, sellItem, sellPosition,
  getUserInventory, getMarketHistory, getPriceHistoryForItem, collectRent,
} from '../services/marketService.js';
import { checkAchievements } from '../services/achievementService.js';

const router = Router();

router.get('/items', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const category = req.query.category as string | undefined;
    const items = getMarketItems(category);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/items/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const item = getMarketItemDetail(req.params.id as string);
    res.json(item);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/buy', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { item_id, quantity } = req.body;
    if (!item_id) {
      res.status(400).json({ error: 'item_id is required' });
      return;
    }
    const result = buyItem(req.userId!, item_id, quantity || 1);
    const newAchievements = checkAchievements(req.userId!);
    res.json({ ...result, new_achievements: newAchievements.length > 0 ? newAchievements : undefined });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sell', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { inventory_id } = req.body;
    if (!inventory_id) {
      res.status(400).json({ error: 'inventory_id is required' });
      return;
    }
    const result = sellItem(req.userId!, inventory_id);
    const newAchievements = checkAchievements(req.userId!);
    res.json({ ...result, new_achievements: newAchievements.length > 0 ? newAchievements : undefined });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sell-position', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { item_id } = req.body;
    if (!item_id) {
      res.status(400).json({ error: 'item_id is required' });
      return;
    }
    const result = sellPosition(req.userId!, item_id);
    const newAchievements = checkAchievements(req.userId!);
    res.json({ ...result, new_achievements: newAchievements.length > 0 ? newAchievements : undefined });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/collect-rent', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const result = collectRent(req.userId!);
    const newAchievements = checkAchievements(req.userId!);
    res.json({ ...result, new_achievements: newAchievements.length > 0 ? newAchievements : undefined });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/inventory', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const inventory = getUserInventory(req.userId!);
    res.json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = getMarketHistory(req.userId!, limit);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/prices/:id', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const periods = parseInt(req.query.periods as string) || 24;
    const history = getPriceHistoryForItem(req.params.id as string, periods);
    res.json(history);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
