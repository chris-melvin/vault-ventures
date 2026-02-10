import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '../components/layout/Header';
import { wallet } from '../lib/api';
import { useGameStore } from '../stores/useGameStore';

const FEATURES = [
  {
    id: 'bank',
    name: 'Bank',
    description: 'Deposit your winnings and earn 0.5% interest per hour',
    path: '/bank',
    gradient: 'from-emerald-900/40 to-teal-900/20',
    icon: '\u{1F3E6}',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Buy and sell collectibles, stocks, property & vehicles',
    path: '/market',
    gradient: 'from-blue-900/40 to-indigo-900/20',
    icon: '\u{1F4C8}',
  },
  {
    id: 'achievements',
    name: 'Achievements',
    description: 'Track your stats and unlock rewards',
    path: '/achievements',
    gradient: 'from-yellow-900/40 to-orange-900/20',
    icon: '\u{1F3C6}',
  },
];

const GAMES = [
  {
    id: 'wheel',
    name: 'Money Wheel',
    description: 'Spin the Big Six wheel for multipliers up to 40x',
    path: '/wheel',
    gradient: 'from-amber-900/40 to-yellow-900/20',
    icon: '\u{1F3A1}',
    minBet: '$1',
  },
  {
    id: 'slots',
    name: 'Slot Machine',
    description: '5-reel slots with motion blur and near-miss tension',
    path: '/slots',
    gradient: 'from-purple-900/40 to-pink-900/20',
    icon: '\u{1F3B0}',
    minBet: '$1',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Classic 21 with smooth card animations',
    path: '/blackjack',
    gradient: 'from-green-900/40 to-emerald-900/20',
    icon: '\u{1F0CF}',
    minBet: '$1',
  },
  {
    id: 'baccarat',
    name: 'Baccarat',
    description: 'Punto Banco with traditional drawing rules',
    path: '/baccarat',
    gradient: 'from-red-900/40 to-rose-900/20',
    icon: '\u{2660}',
    minBet: '$1',
  },
  {
    id: 'uth',
    name: "Ultimate Texas Hold'em",
    description: 'Poker vs the dealer with 4x/3x/2x/1x betting streets',
    path: '/uth',
    gradient: 'from-teal-900/40 to-cyan-900/20',
    icon: '\u{1F0A1}',
    minBet: '$1',
  },
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const setBalance = useGameStore((s) => s.setBalance);

  useEffect(() => {
    wallet.balance().then((res) => setBalance(res.balance_cents)).catch(() => {});
  }, [setBalance]);

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Games</h2>
          <p className="text-white/40">Choose your game</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => navigate(game.path)}
              className="game-card text-left cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-50`} />
              <div className="relative z-10">
                <div className="text-4xl mb-4">{game.icon}</div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-casino-gold transition-colors">
                  {game.name}
                </h3>
                <p className="text-white/40 text-sm mb-3">{game.description}</p>
                <span className="text-xs text-casino-gold/60 uppercase tracking-wider">
                  Min bet: {game.minBet}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Features</h2>
          <p className="text-white/40">Manage your wealth and track progress</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              onClick={() => navigate(feature.path)}
              className="game-card text-left cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-50`} />
              <div className="relative z-10">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-casino-gold transition-colors">
                  {feature.name}
                </h3>
                <p className="text-white/40 text-sm">{feature.description}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
