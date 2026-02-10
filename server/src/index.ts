import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import wheelRoutes from './routes/wheel.js';
import slotsRoutes from './routes/slots.js';
import blackjackRoutes from './routes/blackjack.js';
import baccaratRoutes from './routes/baccarat.js';
import uthRoutes from './routes/uth.js';
import historyRoutes from './routes/history.js';
import bankRoutes from './routes/bank.js';
import achievementRoutes from './routes/achievements.js';
import marketRoutes from './routes/market.js';
import { seedAchievements } from './services/achievementService.js';
import { seedMarketItems } from './services/marketService.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Seed data
seedAchievements();
seedMarketItems();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/baccarat', baccaratRoutes);
app.use('/api/uth', uthRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/market', marketRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Casino server running on http://localhost:${PORT}`);
});
