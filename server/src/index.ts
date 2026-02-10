import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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
import pinballRoutes from './routes/pinball.js';
import { seedAchievements } from './services/achievementService.js';
import { seedMarketItems } from './services/marketService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

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
app.use('/api/pinball', pinballRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve client static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Casino server running on http://localhost:${PORT}`);
});
