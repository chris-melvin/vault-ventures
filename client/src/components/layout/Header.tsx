import { useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGameStore } from '../../stores/useGameStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useMetaStore } from '../../stores/useMetaStore';
import { formatCents } from '../../lib/constants';
import { bank } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { username, logout } = useAuthStore();
  const balance = useGameStore((s) => s.balance_cents);
  const { muted, toggleMute } = useAudioStore();
  const bankAccount = useMetaStore((s) => s.bankAccount);
  const setBankAccount = useMetaStore((s) => s.setBankAccount);
  const navigate = useNavigate();

  useEffect(() => {
    bank.getAccount().then(setBankAccount).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-casino-dark/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/lobby')}
          className="text-casino-gold font-bold text-xl tracking-wider hover:text-casino-gold-light transition-colors cursor-pointer"
        >
          SOLAIRE
        </button>

        <div className="flex items-center gap-6">
          <div className="card-panel px-4 py-2 gold-glow">
            <span className="text-xs text-white/50 block leading-none">WALLET</span>
            <span className="text-casino-gold font-bold text-lg leading-tight">
              {formatCents(balance)}
            </span>
          </div>

          {bankAccount && bankAccount.balance_cents > 0 && (
            <button
              onClick={() => navigate('/bank')}
              className="card-panel px-3 py-2 hover:border-casino-gold/30 transition-colors cursor-pointer"
            >
              <span className="text-xs text-white/50 block leading-none">BANK</span>
              <span className="text-green-400 font-bold text-sm leading-tight">
                {formatCents(bankAccount.balance_cents)}
              </span>
            </button>
          )}

          <button
            onClick={toggleMute}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-casino-card
                       border border-white/10 hover:border-casino-gold/30 transition-colors cursor-pointer"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm">{username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/40 hover:text-casino-red transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
