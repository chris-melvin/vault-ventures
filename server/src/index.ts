import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import wheelRoutes from './routes/wheel.js';
import slotsRoutes from './routes/slots.js';
import blackjackRoutes from './routes/blackjack.js';
import baccaratRoutes from './routes/baccarat.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/baccarat', baccaratRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Casino server running on http://localhost:${PORT}`);
});
